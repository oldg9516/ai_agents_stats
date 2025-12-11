# План: AI Chat для Backlog Reports

## Цель
Добавить интерактивный чат с AI на страницу отчёта, который позволит задавать вопросы по содержимому отчёта и связанным тикетам (10,000 - 50,000+ тикетов).

---

## Выбранный подход: RAG через n8n + Pinecone

**Ключевые решения:**
1. **Pinecone** - для хранения векторов (уже есть в проекте, масштабируется до миллионов записей)
2. **n8n** - вся логика чата на бэкенде (поиск, формирование контекста, вызов LLM)
3. **Frontend** - минимальный, только отправка вопросов и отображение ответов
4. **Масштабирование** - работает с любым количеством тикетов (10K, 50K, 100K+)

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Report Detail Page                      │   │
│  │  ┌─────────────┐  ┌──────────────────────────────┐ │   │
│  │  │   Report    │  │         Chat Panel           │ │   │
│  │  │   Content   │  │  [Ask about this report...]  │ │   │
│  │  │             │  │                              │ │   │
│  │  │             │  │  User: Why shipping issues?  │ │   │
│  │  │             │  │  AI: Based on 345 tickets... │ │   │
│  │  └─────────────┘  └──────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │ POST /webhook/report-chat
           │ { report_id, question, history }
           ▼
┌─────────────────────────────────────────────────────────────┐
│                      n8n Flow (Chat)                         │
│                                                              │
│  1. Webhook получает запрос                                 │
│  2. Загружает отчёт из Supabase (executive_summary, stats)  │
│  3. Создаёт embedding вопроса (OpenAI)                      │
│  4. Ищет релевантные тикеты в Pinecone (top-20)            │
│  5. Формирует контекст (отчёт + тикеты + история)          │
│  6. Отправляет в GPT-4o                                     │
│  7. Возвращает ответ + sources                              │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐    ┌──────────────────────────────────┐
│      Pinecone       │    │           Supabase               │
│                     │    │                                  │
│  namespace:         │    │  backlog_reports (отчёты)        │
│  "report_{id}"      │    │  support_threads_data (тикеты)   │
│                     │    │                                  │
│  vectors:           │    │                                  │
│  - ticket text      │    │                                  │
│  - metadata:        │    │                                  │
│    - thread_id      │    │                                  │
│    - category       │    │                                  │
│    - date           │    │                                  │
└─────────────────────┘    └──────────────────────────────────┘
```

### Почему Pinecone вместо pgvector:
- **Масштабирование**: Pinecone легко держит миллионы векторов
- **Уже есть**: Pinecone уже интегрирован в проект
- **Namespace**: Изоляция по report_id через namespaces
- **Скорость**: Оптимизирован для similarity search

---

## Детальный план реализации

### Фаза 1: n8n Flow для создания embeddings

При генерации отчёта добавить шаг сохранения векторов в Pinecone:

```
[Существующий flow генерации отчёта]
                │
                ▼
[Get Report ID] → [Get All Tickets for Period] →
[Split into Batches of 100] → [Create Embeddings (OpenAI)] →
[Upsert to Pinecone with namespace "report_{id}"]
```

**Pinecone структура записи:**
```json
{
  "id": "ticket_{thread_id}",
  "values": [0.123, 0.456, ...],  // 1536 dimensions
  "metadata": {
    "thread_id": "abc123",
    "ticket_id": "TKT-456",
    "category": "shipping_or_delivery_question",
    "text": "Customer asked about delayed shipment...",
    "date": "2025-12-01"
  }
}
```

### Фаза 2: n8n Flow для чата (НОВЫЙ)

```
┌──────────────────────────────────────────────────────────────┐
│                    n8n Chat Flow                              │
│                                                               │
│  [Webhook] ─────────────────────────────────────────────────▶│
│     │ POST { report_id, question, history[] }                │
│     ▼                                                         │
│  [Get Report from Supabase] ────────────────────────────────▶│
│     │ SELECT executive_summary, stats, main_patterns         │
│     ▼                                                         │
│  [Create Question Embedding] ───────────────────────────────▶│
│     │ OpenAI text-embedding-3-small                          │
│     ▼                                                         │
│  [Query Pinecone] ──────────────────────────────────────────▶│
│     │ namespace: "report_{id}", topK: 20                     │
│     ▼                                                         │
│  [Build Context] ───────────────────────────────────────────▶│
│     │ Combine: report summary + relevant tickets + history   │
│     ▼                                                         │
│  [Call GPT-4o] ─────────────────────────────────────────────▶│
│     │ System prompt + context + question                     │
│     ▼                                                         │
│  [Format Response] ─────────────────────────────────────────▶│
│     │ { answer, sources: [{thread_id, snippet}] }            │
│     ▼                                                         │
│  [Return to Frontend] ──────────────────────────────────────▶│
└──────────────────────────────────────────────────────────────┘
```

**System Prompt для чата:**
```
You are an AI assistant analyzing a customer support backlog report.
You have access to:
1. Executive summary of the report
2. Statistics by category
3. Main patterns identified
4. Relevant individual tickets (retrieved via semantic search)

Answer questions about the report data. When citing specific tickets,
mention the thread_id. Be concise but thorough.

If asked about specific examples, use the retrieved tickets.
If asked for general trends, use the report summary and statistics.
```

### Фаза 3: Frontend (минимальный)

#### 3.1 Server Action (просто прокси к n8n)
```typescript
// lib/actions/report-chat-actions.ts
'use server'

export async function askReportQuestion(
  reportId: string,
  question: string,
  history: { role: string; content: string }[]
): Promise<{ answer: string; sources: { thread_id: string; snippet: string }[] }> {
  const response = await fetch(process.env.N8N_CHAT_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.N8N_X_API_KEY!,
    },
    body: JSON.stringify({ report_id: reportId, question, history }),
  })

  if (!response.ok) {
    throw new Error('Chat request failed')
  }

  return response.json()
}
```

#### 3.2 Компонент чата
```typescript
// components/backlog/report-chat.tsx
'use client'

import { useState } from 'react'
import { askReportQuestion } from '@/lib/actions/report-chat-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconSend, IconLoader2 } from '@tabler/icons-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { thread_id: string; snippet: string }[]
}

export function ReportChat({ reportId }: { reportId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const { answer, sources } = await askReportQuestion(
        reportId,
        input,
        messages.map(m => ({ role: m.role, content: m.content }))
      )

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer,
        sources
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Ask AI about this report</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ask questions about patterns, trends, or specific tickets
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-8'
                  : 'bg-muted mr-8'
              }`}
            >
              {msg.content}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs opacity-70">Sources:</p>
                  {msg.sources.map((s, j) => (
                    <p key={j} className="text-xs opacity-70">
                      • {s.thread_id}: {s.snippet}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="bg-muted p-3 rounded-lg mr-8">
              <IconLoader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Why did shipping issues increase?"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={isLoading}
          />
          <Button onClick={handleSubmit} disabled={isLoading} size="icon">
            <IconSend className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 3.3 Интеграция в страницу отчёта
```typescript
// В backlog-report-detail.tsx:
import { ReportChat } from './backlog/report-chat'

// В JSX после tabs:
<div className="mt-6">
  <ReportChat reportId={report.id} />
</div>
```

---

## Environment Variables

```env
# Уже есть в проекте:
PINECONE_API_KEY=...
PINECONE_INDEX=...

# Новая переменная:
N8N_CHAT_WEBHOOK_URL=https://your-n8n.com/webhook/report-chat
```

---

## Структура файлов

### Новые файлы (Next.js):
```
lib/
└── actions/
    └── report-chat-actions.ts     # Server Action (прокси к n8n)

components/
└── backlog/
    └── report-chat.tsx            # Компонент чата
```

### Файлы для модификации:
- `components/backlog-report-detail.tsx` - добавить ReportChat

### n8n:
- Модифицировать существующий flow генерации (добавить Pinecone upsert)
- Создать новый flow для чата (webhook → Pinecone → GPT → response)

---

## Порядок реализации

1. **n8n: Embeddings flow** (2-3ч)
   - Добавить в существующий flow генерации отчёта
   - После создания отчёта: batch embeddings → Pinecone upsert
   - Namespace: `report_{id}`

2. **n8n: Chat flow** (2-3ч)
   - Создать новый webhook `/webhook/report-chat`
   - Логика: Get report → Embed question → Query Pinecone → GPT-4o → Response

3. **Frontend** (1-2ч)
   - `report-chat-actions.ts` - прокси к n8n
   - `report-chat.tsx` - UI компонент
   - Интеграция в `backlog-report-detail.tsx`

4. **Тестирование** (1-2ч)
   - Сгенерировать отчёт с embeddings
   - Протестировать чат на разных вопросах

---

## Преимущества подхода с n8n

1. **Вся логика в одном месте** - легко отлаживать и модифицировать
2. **Не нагружает Next.js** - тяжёлые операции на n8n
3. **Масштабирование** - Pinecone держит любое количество векторов
4. **Гибкость** - легко менять модели, prompts, количество результатов
