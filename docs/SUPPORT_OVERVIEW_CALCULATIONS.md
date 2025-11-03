# Support Overview Calculations Documentation

Полная документация по расчету всех метрик, KPI и графиков на странице Support Overview.

## Содержание

1. [Основные принципы](#основные-принципы)
2. [KPI Cards (4 карточки)](#kpi-cards-4-карточки)
3. [Status Distribution (Pie Chart)](#status-distribution-pie-chart)
4. [Resolution Time (Bar Chart)](#resolution-time-bar-chart)
5. [AI Draft Flow (Sankey Diagram)](#ai-draft-flow-sankey-diagram)
6. [Requirements Correlation (Heatmap)](#requirements-correlation-heatmap)
7. [Support Threads Table](#support-threads-table)
8. [Thread Detail Page](#thread-detail-page)
9. [Тренды и сравнения периодов](#тренды-и-сравнения-периодов)

---

## Основные принципы

### База данных

**Основная таблица**: `support_threads_data`

**Поля**:
- `thread_id` (text) - уникальный идентификатор треда
- `ticket_id` (text) - ID тикета в системе поддержки
- `request_type` (text) - тип запроса (например, "support_request")
- `request_subtype` (text) - подтип/категория запроса
- `status` (text) - статус треда (11 возможных значений)
- `requires_reply` (boolean) - требуется ли ответ клиенту
- `requires_identification` (boolean) - требуется ли идентификация пользователя
- `requires_editing` (boolean) - требуется ли редактирование AI-драфта
- `requires_subscription_info` (boolean) - требуется ли информация о подписке
- `requires_tracking_info` (boolean) - требуется ли информация о треке
- `requires_box_contents_info` (boolean) - требуется ли информация о содержимом коробки
- `ai_draft_reply` (text) - AI-сгенерированный черновик ответа
- `prompt_version` (text) - версия промпта
- `created_at` (timestamp) - дата создания треда
- `thread_date` (timestamp) - дата треда

**Дополнительная таблица**: `ai_human_comparison` (для качества)

### Статусы треда

Всего **11 статусов** (определены в базе данных):

1. **`AI Processing`** - AI обрабатывает запрос
2. **`Data collected`** - Необходимые данные собраны
3. **`Getting tracking data`** - Получение информации о треке
4. **`Got tracking data`** - Информация о треке получена
5. **`Identifying`** - Идентификация пользователя
6. **`Identifying — Many users`** - Найдено несколько пользователей
7. **`Identifying — Not found`** - Пользователь не найден
8. **`new`** - Новый тред
9. **`Reply is ready`** - Ответ готов ✅ (используется для resolution rate)
10. **`Reply not required`** - Ответ не требуется
11. **`ZOHO draft created`** - Черновик создан в ZOHO

### Requirements (Требования)

Система отслеживает **6 типов требований**:
- `requires_reply` - Требуется ответ
- `requires_identification` - Требуется идентификация
- `requires_editing` - Требуется редактирование
- `requires_subscription_info` - Требуется информация о подписке
- `requires_tracking_info` - Требуется информация о треке
- `requires_box_contents_info` - Требуется информация о содержимом коробки

### JOIN с таблицей качества

Для расчета **качества AI-драфтов** данные из `support_threads_data` объединяются с `ai_human_comparison` по полю `prompt_version`:

```sql
SELECT
  st.*,
  ah.changed,
  ah.email as reviewer_email,
  CASE
    WHEN ah.changed = false THEN 100
    WHEN ah.changed = true THEN 0
    ELSE NULL
  END as quality_percentage
FROM support_threads_data st
LEFT JOIN ai_human_comparison ah
  ON st.prompt_version = ah.prompt_version
  AND ah.email IN (:qualifiedAgents)
```

### Фильтры

Все расчеты учитывают активные фильтры:
- **Date Range** - диапазон дат (`created_at`)
- **Status** - статусы тредов (`status`)
- **Request Type** - типы запросов (`request_type`)
- **Requirements** - активные требования (все `requires_*` поля)
- **Version** - версии промптов (`prompt_version`)

---

## KPI Cards (4 карточки)

### 1. AI Draft Coverage (Покрытие AI-драфтами)

**Что показывает**: Процент тредов, для которых AI сгенерировал черновик ответа.

**Расчет**:
```sql
SELECT
  COUNT(*) FILTER (WHERE ai_draft_reply IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0) as coverage
FROM support_threads_data
WHERE created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
```

**Формула**:
```typescript
aiDraftCoverage = (threadsWithDraft / totalThreads) × 100
```

**Пример**:
```
Всего тредов: 1000
Тредов с AI-драфтом: 850

AI Draft Coverage = (850 / 1000) × 100 = 85%
```

**Интерпретация**:
- ✅ **Высокий % (>80%)** - AI активно помогает агентам
- ⚠️ **Низкий % (<50%)** - много тредов без AI-драфтов

**Тренд**: Сравнение с предыдущим периодом.

**Код**: [`lib/supabase/queries-support.ts:fetchSupportKPIs()`](lib/supabase/queries-support.ts#L49-L203)

---

### 2. Reply Required (Требуется ответ)

**Что показывает**: Процент тредов, которые требуют ответа клиенту.

**Расчет**:
```sql
SELECT
  COUNT(*) FILTER (WHERE requires_reply = true) * 100.0 / NULLIF(COUNT(*), 0) as reply_pct
FROM support_threads_data
WHERE created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
```

**Формула**:
```typescript
replyRequired = (threadsRequiringReply / totalThreads) × 100
```

**Пример**:
```
Всего тредов: 1000
Требуют ответа: 720

Reply Required = (720 / 1000) × 100 = 72%
```

**Интерпретация**:
- ✅ **Высокий %** - много активных диалогов с клиентами
- ⚠️ **Низкий %** - большинство тредов информационные или не требуют ответа

**Тренд**: Сравнение с предыдущим периодом.

**Код**: [`lib/supabase/queries-support.ts:fetchSupportKPIs()`](lib/supabase/queries-support.ts#L49-L203)

---

### 3. Resolution Rate (Процент разрешенных)

**Что показывает**: Процент тредов со статусом "Reply is ready" (ответ готов).

**Расчет**:
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'Reply is ready') * 100.0 / NULLIF(COUNT(*), 0) as resolution_rate
FROM support_threads_data
WHERE created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
```

**Формула**:
```typescript
resolutionRate = (resolvedThreads / totalThreads) × 100
```

**Пример**:
```
Всего тредов: 1000
Статус "Reply is ready": 650

Resolution Rate = (650 / 1000) × 100 = 65%
```

**Интерпретация**:
- ✅ **Высокий % (>70%)** - эффективная обработка тредов
- ⚠️ **Низкий % (<40%)** - много незавершенных тредов

**Тренд**: Сравнение с предыдущим периодом.

**Код**: [`lib/supabase/queries-support.ts:fetchSupportKPIs()`](lib/supabase/queries-support.ts#L49-L203)

---

### 4. Avg Requirements (Среднее количество требований)

**Что показывает**: Среднее количество активных требований на один тред.

**Расчет**:
```sql
SELECT
  SUM(
    (requires_reply::int) +
    (requires_identification::int) +
    (requires_editing::int) +
    (requires_subscription_info::int) +
    (requires_tracking_info::int) +
    (requires_box_contents_info::int)
  ) * 1.0 / NULLIF(COUNT(*), 0) as avg_requirements
FROM support_threads_data
WHERE created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
```

**Формула**:
```typescript
avgRequirements = totalRequirementsCount / totalThreads
```

**Пример**:
```
Тред 1: 3 требования (reply, identification, tracking)
Тред 2: 1 требование (reply)
Тред 3: 2 требования (editing, subscription)
Всего тредов: 3

Avg Requirements = (3 + 1 + 2) / 3 = 2.0
```

**Интерпретация**:
- ✅ **Низкое значение (<2)** - простые запросы
- ⚠️ **Высокое значение (>3)** - сложные запросы с множественными требованиями

**Тренд**: Сравнение с предыдущим периодом.

**Код**: [`lib/supabase/queries-support.ts:fetchSupportKPIs()`](lib/supabase/queries-support.ts#L49-L203)

---

## Status Distribution (Pie Chart)

**Что показывает**: Распределение тредов по статусам.

**Тип графика**: Pie chart

**Расчет**:
```sql
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM support_threads_data
WHERE created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
GROUP BY status
ORDER BY count DESC
```

**Структура данных**:
```typescript
[
  {
    status: "Reply is ready",
    count: 450,
    percentage: 45.0
  },
  {
    status: "AI Processing",
    count: 230,
    percentage: 23.0
  },
  {
    status: "Data collected",
    count: 180,
    percentage: 18.0
  },
  ...
]
```

**Визуализация**:
- **Размер сектора**: Пропорционален количеству тредов
- **Цвет**: Динамические CSS переменные для каждого статуса
  - Используется `toSafeCssName()` для конвертации статусов в валидные CSS имена
  - Пример: `"Reply is ready"` → `Reply-is-ready` → `var(--status-Reply-is-ready)`
- **Label**: Человекочитаемое название статуса + процент
- **Tooltip**: Показывает:
  - Количество тредов
  - Процент от общего

**Человекочитаемые названия** (из `constants/support-statuses.ts`):
```typescript
const STATUS_LABELS = {
  'AI Processing': 'AI обрабатывает',
  'Reply is ready': 'Ответ готов',
  'new': 'Новый',
  // ... и т.д.
}
```

**Код**:
- Запрос: [`lib/supabase/queries-support.ts:fetchStatusDistribution()`](lib/supabase/queries-support.ts#L205-L253)
- Компонент: [`components/charts/status-distribution-chart.tsx`](components/charts/status-distribution-chart.tsx)
- Константы: [`constants/support-statuses.ts`](constants/support-statuses.ts)

---

## Resolution Time (Bar Chart)

**Что показывает**: Среднее время разрешения тредов по неделям (только для статуса "Reply is ready").

**Тип графика**: Bar chart

**Расчет**:
```sql
SELECT
  DATE_TRUNC('week', created_at) as week_start,
  COUNT(*) as thread_count,
  AVG(resolution_time_hours) as avg_resolution_time
FROM support_threads_data
WHERE status = 'Reply is ready'
  AND created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start ASC
```

**⚠️ Примечание**: В текущей реализации используется **placeholder логика** (24 часа для всех), так как в базе нет поля `resolved_at`. В production версии нужно:

1. Добавить поле `resolved_at` в таблицу
2. Рассчитывать реальное время:
```sql
EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 as resolution_time_hours
```

**Структура данных**:
```typescript
[
  {
    weekStart: "2024-01-01",
    avgResolutionTime: 18.5,  // часы
    threadCount: 45
  },
  {
    weekStart: "2024-01-08",
    avgResolutionTime: 22.3,
    threadCount: 52
  },
  ...
]
```

**Визуализация**:
- **X-axis**: Недели (week_start)
- **Y-axis**: Среднее время разрешения (часы)
- **Bars**: Высота = время разрешения
- **Color**: Градиент в зависимости от времени
  - Зеленый: быстрое разрешение (<12 часов)
  - Желтый: среднее (12-24 часа)
  - Красный: медленное (>24 часов)
- **Tooltip**: Показывает время + количество тредов

**Интерпретация**:
- ✅ **Низкое время (<12 часов)** - эффективная поддержка
- ⚠️ **Высокое время (>48 часов)** - проблемы с обработкой

**Код**:
- Запрос: [`lib/supabase/queries-support.ts:fetchResolutionTimeData()`](lib/supabase/queries-support.ts#L255-L325)
- Компонент: [`components/charts/resolution-time-chart.tsx`](components/charts/resolution-time-chart.tsx)

---

## AI Draft Flow (Sankey Diagram)

**Что показывает**: Путь AI-драфтов от создания до финального статуса.

**Тип графика**: Sankey diagram (flow diagram)

**Логика потоков**:

1. **AI Draft Created** (источник) →
   - **Used As-Is** (использован без изменений)
   - **Edited** (отредактирован)
   - **Rejected** (отклонен, нет AI-драфта)

2. **Used As-Is** / **Edited** →
   - **Resolved** (статус "Reply is ready")
   - **Pending** (другие статусы)

**Расчет**:
```sql
SELECT
  ai_draft_reply IS NOT NULL as has_draft,
  requires_editing,
  status = 'Reply is ready' as is_resolved
FROM support_threads_data
WHERE created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
```

**Подсчет потоков**:
```typescript
const flowCounts = {
  created: 0,      // Тредов с AI-драфтом
  usedAsIs: 0,     // Драфт использован без правки (requires_editing = false)
  edited: 0,       // Драфт отредактирован (requires_editing = true)
  rejected: 0,     // Нет AI-драфта
  resolved: 0,     // Статус "Reply is ready"
  pending: 0       // Другие статусы
}

threads.forEach(thread => {
  if (thread.ai_draft_reply) {
    flowCounts.created++

    if (thread.requires_editing) {
      flowCounts.edited++
    } else {
      flowCounts.usedAsIs++
    }

    if (thread.status === 'Reply is ready') {
      flowCounts.resolved++
    } else {
      flowCounts.pending++
    }
  } else {
    flowCounts.rejected++
  }
})
```

**Структ��ра данных**:
```typescript
{
  nodes: [
    { id: 'created', label: 'AI Draft Created' },
    { id: 'used', label: 'Used As-Is' },
    { id: 'edited', label: 'Edited' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'pending', label: 'Pending' }
  ],
  links: [
    { source: 'created', target: 'used', value: 450 },
    { source: 'created', target: 'edited', value: 280 },
    { source: 'created', target: 'rejected', value: 50 },
    { source: 'used', target: 'resolved', value: 350 },
    { source: 'edited', target: 'resolved', value: 200 },
    { source: 'used', target: 'pending', value: 100 },
    { source: 'edited', target: 'pending', value: 80 }
  ]
}
```

**Визуализация**:
- **Nodes**: Этапы обработки
- **Links**: Потоки между этапами (ширина = количество тредов)
- **Colors**:
  - Зеленые оттенки для положительных потоков (used, resolved)
  - Желтые для редактирования
  - Красные для отклонений
- **Responsive**: Адаптивная высота для мобильных устройств

**Интерпретация**:
- ✅ **Большой поток Created → Used → Resolved** - AI работает хорошо
- ⚠️ **Большой поток Created → Edited** - AI требует частых правок
- ❌ **Большой поток Rejected** - AI не генерирует драфты

**Код**:
- Запрос: [`lib/supabase/queries-support.ts:fetchSankeyData()`](lib/supabase/queries-support.ts#L327-L431)
- Компонент: [`components/charts/ai-draft-flow-sankey.tsx`](components/charts/ai-draft-flow-sankey.tsx)

---

## Requirements Correlation (Heatmap)

**Что показывает**: Корреляция между различными типами требований (какие требования часто встречаются вместе).

**Тип графика**: Heatmap (тепловая карта)

**Расчет**:
```sql
SELECT
  requires_reply,
  requires_identification,
  requires_editing,
  requires_subscription_info,
  requires_tracking_info,
  requires_box_contents_info
FROM support_threads_data
WHERE created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
```

**Подсчет корреляций**:
```typescript
const requirementKeys = [
  'requires_reply',
  'requires_identification',
  'requires_editing',
  'requires_subscription_info',
  'requires_tracking_info',
  'requires_box_contents_info'
]

const correlations: CorrelationCell[] = []

for (const req1 of requirementKeys) {
  for (const req2 of requirementKeys) {
    // Количество тредов, где оба требования = true
    const bothTrue = threads.filter(t =>
      t[req1] === true && t[req2] === true
    ).length

    const total = threads.length

    // Корреляция = вероятность совместного появления
    const correlation = total > 0 ? bothTrue / total : 0

    correlations.push({
      x: req1,
      y: req2,
      value: correlation  // 0.0 - 1.0
    })
  }
}
```

**Структура данных**:
```typescript
[
  {
    x: "requires_reply",
    y: "requires_identification",
    value: 0.65  // 65% тредов имеют оба требования
  },
  {
    x: "requires_reply",
    y: "requires_tracking_info",
    value: 0.42  // 42% тредов
  },
  {
    x: "requires_identification",
    y: "requires_identification",
    value: 1.0  // Диагональ всегда 1.0 (100%)
  },
  ...
]
```

**Визуализация**:
- **X-axis**: Первое требование
- **Y-axis**: Второе требование
- **Cell color**: Интенсивность корреляции
  - Холодные цвета (синий): низкая корреляция (0-30%)
  - Теплые цвета (желтый): средняя корреляция (30-70%)
  - Горячие цвета (красный): высокая корреляция (70-100%)
- **Diagonal**: Всегда 100% (требование с самим собой)
- **Tooltip**: Показывает процент корреляции

**Интерпретация**:

**Пример 1** - Высокая корреляция:
```
requires_reply ↔ requires_identification = 0.85 (85%)
→ Когда нужен ответ, почти всегда нужна идентификация
```

**Пример 2** - Низкая корреляция:
```
requires_editing ↔ requires_tracking_info = 0.15 (15%)
→ Эти требования редко встречаются вместе
```

**Применение**:
- Оптимизация workflow - объединить связанные шаги
- Предсказание требований - если есть A, вероятно нужно B
- Обучение AI - учитывать связанные требования

**Код**:
- Запрос: [`lib/supabase/queries-support.ts:fetchCorrelationMatrix()`](lib/supabase/queries-support.ts#L433-L486)
- Компонент: [`components/charts/requirements-correlation-heatmap.tsx`](components/charts/requirements-correlation-heatmap.tsx)

---

## Support Threads Table

**Что показывает**: Детальная таблица всех тредов поддержки с метриками качества.

**Columns (10 колонок)**:

1. **Thread ID** - уникальный ID треда (моноширинный шрифт, обрезается)
2. **Ticket ID** - ID тикета (моноширинный шрифт)
3. **Request Type** - тип запроса (с человекочитаемыми названиями)
4. **Category** - категория/подтип запроса (request_subtype)
5. **Status** - текущий статус (с человекочитаемыми названиями)
6. **Requirements** - список активных требований (badges)
7. **AI Draft** - есть ли AI-драфт (✓ или ✗)
8. **Quality %** - процент качества (цветовое кодирование)
9. **Version** - версия промпта
10. **Created At** - дата создания (формат: "Jan 15, 2024")

**Расчет данных**:

```sql
-- Шаг 1: Получить треды
SELECT *
FROM support_threads_data
WHERE created_at BETWEEN :dateFrom AND :dateTo
  [AND filters...]
ORDER BY created_at DESC
LIMIT 100

-- Шаг 2: JOIN с качеством (отдельный запрос)
SELECT prompt_version, changed, email
FROM ai_human_comparison
WHERE prompt_version IN (:versions)
  AND email IN (:qualifiedAgents)

-- Шаг 3: Объединить данные (в коде)
threads.map(thread => ({
  ...thread,
  changed: comparisonData?.changed ?? null,
  email: comparisonData?.email ?? null,
  qualityPercentage:
    comparisonData?.changed === false ? 100 :
    comparisonData?.changed === true ? 0 :
    null
}))
```

**Особенности**:

### Поиск
```typescript
// Поиск по Thread ID или Ticket ID
globalFilterFn: (row, columnId, filterValue) => {
  const threadId = String(row.original.thread_id || '').toLowerCase()
  const ticketId = String(row.original.ticket_id || '').toLowerCase()
  const filter = String(filterValue).toLowerCase()
  return threadId.includes(filter) || ticketId.includes(filter)
}
```

### Сортировка
- По любой колонке (click на header)
- По умолчанию: `created_at DESC` (новые сверху)

### Пагинация
- 20 тредов на страницу
- Навигация: Previous / Next

### Цветовое кодирование Quality %
```typescript
const bgClass =
  value > 60 ? 'bg-green-100 dark:bg-green-900' :   // 🟢 Хорошо
  value > 30 ? 'bg-yellow-100 dark:bg-yellow-900' : // 🟡 Средне
               'bg-red-100 dark:bg-red-900'          // 🔴 Плохо
```

### Click на строку
```typescript
handleRowClick = (thread) => {
  router.push(`/support-overview/thread/${thread.thread_id}`)
  // Открывает модальное окно с деталями треда
}
```

### CSV Export
Экспортирует ВСЕ треды (не только текущую страницу):
```csv
Thread ID,Ticket ID,Request Type,Category,Status,Requirements,Has AI Draft,Quality %,Agent Email,Prompt Version,Created At
```

**Код**:
- Запрос: [`lib/supabase/queries-support.ts:fetchSupportThreads()`](lib/supabase/queries-support.ts#L488-L586)
- Компонент: [`components/tables/support-threads-table.tsx`](components/tables/support-threads-table.tsx)
- Export: [`lib/utils/export-support.ts`](lib/utils/export-support.ts)

---

## Thread Detail Page

**Что показывает**: Детальная информация об одном треде поддержки.

**URL**: `/support-overview/thread/[threadId]`

**Расчет данных**:

```sql
-- Шаг 1: Получить тред
SELECT *
FROM support_threads_data
WHERE thread_id = :threadId

-- Шаг 2: Получить качество
SELECT changed, email
FROM ai_human_comparison
WHERE prompt_version = :promptVersion
  AND email IN (:qualifiedAgents)
LIMIT 1
```

**Отображаемая информация**:

### Метаданные
- **Thread ID** - уникальный идентификатор
- **Ticket ID** - ID в системе поддержки
- **Request Type** - тип запроса
- **Category** - категория запроса
- **Status** - текущий статус
- **Prompt Version** - используемая версия
- **Created At** - дата создания (полный формат)

### Качество
```typescript
qualityScore:
  changed === false ? 100 : // AI драфт не изменен
  changed === true ? 0 :    // AI драфт изменен
  null                       // Нет данных
```

- **Quality Score**: 0-100% с цветовым кодированием
- **Reviewed By**: Email квалифицированного агента
- **Status**: Changed / Unchanged

### Требования (Requirements)
Список активных требований с иконками:
```typescript
[
  { key: 'requires_reply', label: 'Reply Required', active: true },
  { key: 'requires_identification', label: 'Identification', active: false },
  { key: 'requires_editing', label: 'Editing', active: true },
  ...
]
```

Визуализация:
- ✅ Зеленая галочка - активно
- ⬜ Серая - неактивно

### AI Draft Reply
Полный текст AI-сгенерированного ответа:
```typescript
{thread.ai_draft_reply ? (
  <pre className="whitespace-pre-wrap">
    {thread.ai_draft_reply}
  </pre>
) : (
  <p className="text-muted-foreground">No AI draft available</p>
)}
```

**Особенности реализации**:

### Server-Side Rendering
```typescript
// app/(analytics)/support-overview/[threadId]/page.tsx
export default async function ThreadDetailPage({ params }) {
  const supabase = createServerClient()  // Server-side client
  const thread = await fetchThreadDetail(supabase, params.threadId)

  return <ThreadDetailView thread={thread} />
}
```

**Преимущества**:
- ✅ SEO-friendly
- ✅ Быстрая загрузка (SSR)
- ✅ Нет loading state

### Навигация
- **Back button** - возврат к таблице
- **URL sharing** - можно поделиться ссылкой на конкретный тред

**Код**:
- Запрос: [`lib/supabase/queries-support.ts:fetchThreadDetail()`](lib/supabase/queries-support.ts#L588-L624)
- Page: [`app/(analytics)/support-overview/[threadId]/page.tsx`](app/(analytics)/support-overview/[threadId]/page.tsx)

---

## Тренды и сравнения периодов

### Расчет предыдущего периода

Идентично Dashboard - сравнение с периодом равной длительности:

```typescript
// Текущий период
const currentFrom = filters.dateRange.from  // 2024-01-01
const currentTo = filters.dateRange.to      // 2024-01-31

// Длительность
const daysDiff = Math.ceil(
  (currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24)
)  // 31 день

// Предыдущий период
const previousFrom = new Date(currentFrom)
previousFrom.setDate(previousFrom.getDate() - daysDiff)  // 2023-12-01
const previousTo = currentFrom  // 2024-01-01
```

### Расчет тренда

```typescript
interface TrendData {
  value: number        // Абсолютное изменение
  percentage: number   // Процентное изменение
  direction: 'up' | 'down' | 'neutral'
}

function calculateTrend(current: number, previous: number): TrendData {
  if (previous === 0) {
    return {
      value: current,
      percentage: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'neutral'
    }
  }

  const value = current - previous
  const percentage = (value / previous) * 100

  return {
    value,
    percentage: Math.abs(percentage),
    direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral'
  }
}
```

### Примеры трендов

**1. AI Draft Coverage**:
```
Current: 85% (850/1000 тредов)
Previous: 78% (702/900 тредов)
Trend: +7% (↑ +8.97%)
→ AI создает больше драфтов
```

**2. Reply Required**:
```
Current: 72% (720/1000 тредов)
Previous: 68% (612/900 тредов)
Trend: +4% (↑ +5.88%)
→ Больше тредов требуют ответа
```

**3. Resolution Rate**:
```
Current: 65% (650/1000 тредов)
Previous: 60% (540/900 тредов)
Trend: +5% (↑ +8.33%)
→ Улучшилась скорость разрешения
```

**4. Avg Requirements**:
```
Current: 2.3 требования/тред
Previous: 2.5 требования/тред
Trend: -0.2 (↓ -8.0%)
→ Запросы стали проще
```

### Интерпретация трендов

**Положительные тренды** (улучшение):
- ↑ AI Draft Coverage - больше автоматизации
- ↑ Resolution Rate - быстрее закрываем треды
- ↓ Avg Requirements - более простые запросы
- ↓ Records Changed (Dashboard) - лучше качество AI

**Отрицательные тренды** (ухудшение):
- ↓ AI Draft Coverage - меньше автоматизации
- ↓ Resolution Rate - медленнее обработка
- ↑ Avg Requirements - более сложные запросы
- ↑ Records Changed (Dashboard) - хуже качество AI

**Код**: [`lib/supabase/queries-support.ts:calculateTrend()`](lib/supabase/queries-support.ts#L26-L43)

---

## Real-time Updates

Support Overview поддерживает **real-time обновления** через Supabase Realtime:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('support_threads_changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'support_threads_data'
      },
      (payload) => {
        console.log('Support thread updated:', payload)
        // Invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ['support'] })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

**Что происходит при обновлении**:
1. Supabase отправляет WebSocket уведомление
2. React Query инвалидирует кэш
3. Автоматическ��й refetch данных
4. UI обновляется без перезагрузки страницы

**События**:
- `INSERT` - новый тред создан
- `UPDATE` - статус/данные треда обновлены
- `DELETE` - тред удален

**Код**: [`lib/queries/support-queries.ts:useSupportData()`](lib/queries/support-queries.ts)

---

## Производительность

### Оптимизации

1. **SELECT только нужных полей**:
```typescript
// KPIs - минимум полей
const selectFields = [
  'ai_draft_reply',
  'requires_reply',
  'status',
  ...requirementKeys
].join(',')

// Таблица - все поля
.select('*')  // Нужны все для отображения
```

2. **Индексы** (см. `database-indexes.sql`):
   - `idx_support_created_at`
   - `idx_support_status`
   - `idx_support_request_type`
   - `idx_support_prompt_version`
   - Composite indexes для частых фильтров

3. **Pagination**:
```typescript
.range(offset, offset + limit - 1)  // 100 тредов за раз
```

4. **Separate JOIN query**:
```typescript
// Сначала получить треды
const threads = await fetchThreads()

// Потом JOIN с качеством (один запрос для всех версий)
const versions = [...new Set(threads.map(t => t.prompt_version))]
const comparisonData = await fetchComparison(versions)

// Объединить в коде (быстрее, чем SQL JOIN)
```

5. **React Query caching**:
```typescript
staleTime: 2 * 60 * 1000,    // 2 минуты
gcTime: 10 * 60 * 1000,       // 10 минут
retry: 2,                      // 2 попытки
retryDelay: 1000              // 1 секунда между попытками
```

### Мониторинг

Логи производительности в консоли:
```
🚀 [Support] Starting data fetch...
✅ [Support] KPIs took 987ms
✅ [Support] StatusDist took 1245ms
✅ [Support] ResolutionTime took 1532ms
✅ [Support] SankeyData took 1876ms
✅ [Support] CorrelationMatrix took 2103ms
✅ [Support] Threads took 3456ms
🏁 [Support] Total fetch time: 3457ms
```

**Целевые показатели**:
- KPIs: < 2 сек
- Charts: < 3 сек каждый
- Threads: < 5 сек
- Total: < 10 сек

### Timeout Protection

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000)

try {
  const result = await fetchSupportData(filters)
  clearTimeout(timeoutId)
  return result
} catch (error) {
  clearTimeout(timeoutId)
  if (error.name === 'AbortError') {
    throw new Error('Request timed out')
  }
  throw error
}
```

---

## Примеры использования данных

### Пример 1: Анализ эффективности AI-драфтов

**Цель**: Понять, насколько эффективно AI помогает агентам.

**Где смотреть**:
1. **AI Draft Coverage KPI** - процент покрытия
2. **AI Draft Flow Sankey** - путь драфтов
3. **Support Threads Table** - детали по каждому треду

**Пример инсайта**:
```
AI Draft Coverage: 85% (850/1000)
→ AI создает драфт для большинства тредов ✅

Sankey Flow:
- Created → Used As-Is: 450 (53%)
- Created → Edited: 380 (45%)
- Created → Rejected: 20 (2%)

Вывод: AI драфты используются в 98% случаев!
Из них 53% - без правок = высокое качество AI
```

---

### Пример 2: Выявление узких мест

**Цель**: Найти, где застревают треды.

**Где смотреть**:
1. **Status Distribution** - распределение по статусам
2. **Resolution Rate KPI** - процент завершенных
3. **Resolution Time Chart** - динамика времени

**Пример инсайта**:
```
Status Distribution:
- "Reply is ready": 45% ✅
- "AI Processing": 23%
- "Identifying": 18% ⚠️
- "Data collected": 10%
- Other: 4%

Resolution Rate: 45%

Проблема: 18% тредов застревают на идентификации!
Решение: Улучшить процесс идентификации пользователей
```

---

### Пример 3: Анализ сложности запросов

**Цель**: Понять, какие запросы самые сложные.

**Где смотреть**:
1. **Avg Requirements KPI** - среднее число требований
2. **Requirements Correlation Heatmap** - связи между требованиями
3. **Support Threads Table** - детали по требованиям

**Пример инсайта**:
```
Avg Requirements: 2.3

Correlation Matrix показывает:
- Reply ↔ Identification: 85% (часто вместе)
- Tracking ↔ Subscription: 72% (часто вместе)
- Editing ↔ Box Contents: 15% (редко вместе)

Вывод: Два основных типа сложных запросов:
1. "Кто я?" (reply + identification)
2. "Где моя посылка?" (tracking + subscription)

Можно создать специализированные воркфлоу для каждого типа
```

---

### Пример 4: Оценка качества AI по версиям

**Цель**: Проверить, улучшилось ли качество после обновления промпта.

**Где смотреть**:
1. **Support Threads Table** - фильтр по версии + колонка Quality %
2. **Thread Detail** - детальный просмотр качественных/некачественных тредов

**Пример анализа**:
```
v2 промпт (прошлый месяц):
- 150 тредов
- 78% с качеством = 100 (драфт не изменен)
- 22% с качеством = 0 (драфт изменен)

v3 промпт (этот месяц):
- 280 тредов
- 87% с качеством = 100 ✅ (+9%)
- 13% с качеством = 0

Вывод: v3 существенно лучше v2!
Рекомендация: Перевести все треды на v3
```

---

## FAQ

### Почему используется JOIN с ai_human_comparison?

**Ответ**: Чтобы связать AI-драфты с их качеством (были ли они изменены квалифицированными агентами).

**Логика**:
- `prompt_version` связывает тред поддержки с оценкой качества
- Если агент не изменил AI-драфт → качество 100%
- Если агент изменил → качество 0%

### Что такое "qualified agents"?

**Ответ**: Список опытных агентов поддержки, чьи оценки AI-драфтов считаются надежными. Определен в [`constants/qualified-agents.ts`](constants/qualified-agents.ts).

### Почему Resolution Rate может быть низким?

**Причины**:
1. Много новых тредов (еще не обработаны)
2. Сложные запросы (требуют времени)
3. Ожидание данных от клиента
4. Проблемы в процессе (узкие места)

### Зачем нужна корреляция требований?

**Применение**:
1. **Предсказание** - если есть requirement A, вероятно нужен B
2. **Оптимизация** - объединить связанные шаги в один
3. **Обучение AI** - учитывать связанные контексты
4. **Планирование** - понять типичные комбинации запросов

### Как интерпретировать Sankey diagram?

**Толстые потоки** = много тредов идет по этому пути

**Хорошие паттерны**:
- Created → Used As-Is → Resolved (широкий поток)
- Минимальный поток в Rejected

**Плохие паттерны**:
- Created → Edited → Pending (застревают после правки)
- Большой поток в Rejected (AI не генерирует драфты)

---

## Заключение

Support Overview предоставляет полную картину работы системы поддержки:

- ✅ **Эффективность AI** - покрытие драфтами, качество, путь от создания до использования
- ✅ **Производительность** - скорость разрешения, статусы, узкие места
- ✅ **Сложность запросов** - требования, корреляции, типичные комбинации
- ✅ **Детальный анализ** - таблица с полной информацией по каждому треду
- ✅ **Тренды** - сравнение с предыдущими периодами для отслеживания динамики

Для дополнительной информации см.:
- [PRD.md](PRD.md) - Product Requirements
- [PERFORMANCE.md](PERFORMANCE.md) - Оптимизация производительности
- [DASHBOARD_CALCULATIONS.md](DASHBOARD_CALCULATIONS.md) - Расчеты для основного дашборда
