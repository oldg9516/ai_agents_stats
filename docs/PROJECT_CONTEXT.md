# AI Agent Statistics Dashboard — Описание проекта

## Общее описание

AI Agent Statistics Dashboard — это аналитическая платформа для мониторинга и анализа качества работы AI-агентов в сравнении с человеческими правками. Система отслеживает метрики качества по категориям запросов, версиям промптов и временным периодам, предоставляя данные о качестве AI-генерируемого контента в реальном времени.

## Бизнес-контекст

### Основная идея
Система сравнивает выходные данные AI с человеческими правками для измерения качества AI. Когда квалифицированный агент проверяет результат AI и НЕ вносит изменения (`changed = false`), это означает высокое качество работы AI.

### Ключевые метрики

- **Quality Percentage (Процент качества)**: `(Записи БЕЗ изменений от квалифицированных агентов / Всего записей от квалифицированных агентов) × 100`
- **Qualified Agents (Квалифицированные агенты)**: Определённые сотрудники, чьи проверки учитываются в расчётах качества (список в `constants/qualified-agents.ts`)
- **Categories (Категории)**: Подтипы запросов (разные типы задач генерации контента)
- **Versions (Версии)**: Версии промптов (v1, v2, v3 и т.д.) для отслеживания улучшений

### Цветовая кодировка качества
- **Хорошее (61-100%)**: Зелёный фон
- **Среднее (31-60%)**: Жёлтый фон
- **Плохое (0-30%)**: Красный фон

## Технический стек

### Фреймворки и языки
- **Next.js 16** — App Router (`app/` директория)
- **React 19** — с TypeScript
- **Tailwind CSS v4** — с CSS-переменными для тем

### UI-компоненты
- **shadcn/ui** — стиль "new-york", компоненты в `components/ui/`
- **@tabler/icons-react** — иконки
- **next-themes** — поддержка тёмной темы

### Данные и состояние
- **Supabase** — PostgreSQL база данных с реальным временем
- **@tanstack/react-query** — кэширование и загрузка данных
- **@tanstack/react-table** — таблицы с сортировкой, фильтрацией, пагинацией
- **zustand** — управление состоянием фильтров

### Визуализация
- **Recharts** — линейные, круговые, столбчатые графики
- **@nivo/sankey** — диаграммы Санкей
- **@nivo/heatmap** — тепловые карты

### Интернационализация
- **next-intl** — поддержка русского (по умолчанию) и английского языков
- Файлы переводов: `messages/ru.json`, `messages/en.json`

## Архитектура приложения

### Структура маршрутов

**Публичные (без авторизации):**
- `/` — Лендинг
- `/docs` — Документация
- `/login` — Вход через Google OAuth
- `/unauthorized` — Отказ в доступе

**Защищённые (требуют авторизации @levhaolam.com):**
- `/dashboard` — Главный дашборд с KPI, графиками, таблицей
- `/detailed-stats` — Полноэкранная таблица (оптимизирована, в 3-5 раз быстрее)
- `/agents-stats` — Статистика по агентам
- `/support-overview` — Обзор поддержки с потоками
- `/tickets-review` — Просмотр тикетов
- `/backlog-reports` — Отчёты по бэклогу
- `/ai-chat` — AI-чат для анализа
- `/request-categories` — Управление категориями
- `/settings` — Настройки

### Паттерн загрузки данных

```
Server Actions (lib/actions/) → React Query (lib/queries/) → Компоненты
         ↓
   Supabase (service_role key, обходит RLS)
```

1. **Server Actions** (`lib/actions/`) — запросы к БД на сервере
2. **React Query** (`lib/queries/`) — кэширование, таймауты, повторы
3. **Zustand** (`lib/store/`) — состояние фильтров (сохраняется в localStorage)
4. **Supabase Realtime** — обновления в реальном времени

### Ключевые директории

```
app/[locale]/(root)/        — Публичные страницы
app/[locale]/(analytics)/   — Защищённые аналитические страницы
components/                  — React-компоненты
  ├── ui/                   — shadcn/ui компоненты
  ├── filters/              — Компоненты фильтров
  ├── kpi/                  — KPI-карточки
  ├── charts/               — Графики
  └── tables/               — Таблицы
lib/
  ├── supabase/             — Клиенты и запросы к БД
  ├── actions/              — Server Actions
  ├── queries/              — React Query хуки
  ├── store/                — Zustand слайсы
  └── utils/                — Утилиты
constants/                   — Константы (агенты, статусы)
messages/                    — Переводы (en.json, ru.json)
```

## База данных

### Таблица `ai_human_comparison`
Основная таблица для дашборда качества AI.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | bigint | Первичный ключ |
| `request_subtype` | text | Категория запроса |
| `prompt_version` | text | Версия промпта (v1, v2...) |
| `created_at` | timestamp | Время создания записи |
| `email` | text | Email агента, обработавшего запись |
| `changed` | boolean | Изменил ли человек результат AI |

### Таблица `support_threads_data`
Таблица для раздела Support Overview.

| Поле | Тип | Описание |
|------|-----|----------|
| `thread_id` | text | Уникальный ID потока |
| `ticket_id` | text | ID связанного тикета |
| `request_type` | text | Тип запроса в поддержку |
| `status` | text | Статус потока (11 значений) |
| `requires_reply` | boolean | Требуется ли ответ клиенту |
| `requires_identification` | boolean | Требуется ли идентификация |
| `requires_editing` | boolean | Требуется ли редактирование AI-черновика |
| `requires_subscription_info` | boolean | Требуется ли инфо о подписке |
| `requires_tracking_info` | boolean | Требуется ли инфо о трекинге |
| `requires_box_contents_info` | boolean | Требуется ли инфо о содержимом |
| `ai_draft_reply` | text | AI-сгенерированный ответ |
| `full_request` | text | Полный текст запроса |
| `prompt_version` | text | Версия промпта |
| `created_at` | timestamp | Время создания |

**Статусы потоков:**
- `new`, `AI Processing`, `Identifying`, `Identifying — Many users`, `Identifying — Not found`
- `Data collected`, `Getting tracking data`, `Got tracking data`
- `Reply is ready`, `Reply not required`, `ZOHO draft created`

## Аутентификация

### Поток авторизации
1. Пользователь заходит на защищённый маршрут
2. Middleware проверяет сессию → редирект на `/login`
3. Google OAuth (PKCE) с подсказкой домена
4. Колбэк `/api/auth/callback` валидирует домен email
5. Только `@levhaolam.com` разрешён
6. Сессия сохраняется в httpOnly cookies

### Тройная защита
1. **Google OAuth Hint** — параметр `hd=levhaolam.com` (UX)
2. **Серверная проверка** — валидация домена в callback
3. **Триггер БД** — PostgreSQL блокирует не-@levhaolam.com

## Команды разработки

```bash
npm run dev      # Запуск dev-сервера (http://localhost:3000)
npm run build    # Сборка для продакшена
npm start        # Запуск продакшен-сервера
npm run lint     # Запуск ESLint
```

**Важно:**
- По умолчанию русская локаль: `http://localhost:3000`
- Английская версия: `http://localhost:3000/en`
- Для входа нужен аккаунт Google с `@levhaolam.com`

## Ключевые паттерны разработки

### Навигация (i18n)
```typescript
// ❌ Неправильно
import { Link } from 'next/navigation'

// ✅ Правильно
import { Link } from '@/i18n/routing'
```

### Переводы
```typescript
import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('namespace')
  return <h1>{t('title')}</h1>
}
```
При добавлении текста обновлять ОБА файла: `messages/en.json` И `messages/ru.json`.

### Запросы к БД
```typescript
// ❌ Неправильно
const { data } = await supabase.from('table').select('*')

// ✅ Правильно — только нужные поля
const { data } = await supabase
  .from('ai_human_comparison')
  .select('id, request_subtype, prompt_version, created_at, email, changed')
```

### Загрузка данных в клиентских компонентах
```typescript
// ❌ Неправильно — прямой вызов Supabase
const supabase = createClient()
const { data } = await supabase.from('table').select()

// ✅ Правильно — через Server Actions
import { fetchDashboardData } from '@/lib/actions/dashboard-actions'
const data = await fetchDashboardData(filters)
```

### Цвета графиков
Использовать CSS-переменные `--chart-1` ... `--chart-5` из `globals.css`.
Для статусов с пробелами использовать `toSafeCssName()`.

## Производительность

- 22 индекса БД в `database-indexes.sql`
- SELECT только нужных полей (не SELECT *)
- Пагинация (лимит 50-100 записей)
- Таймаут 30 секунд, 2 попытки
- Кэш: `staleTime: 2 мин`, `gcTime: 10 мин`
- Отдельные хуки для разных страниц (`useDetailedStats` для /detailed-stats)

## Ключевые файлы

| Назначение | Файлы |
|------------|-------|
| Документация | `docs/PERFORMANCE.md`, `docs/PRD.md`, `docs/AUTH_SETUP_GUIDE.md` |
| База данных | `database-indexes.sql`, `lib/supabase/queries.ts` |
| Аутентификация | `middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts` |
| Интернационализация | `i18n/routing.ts`, `messages/en.json`, `messages/ru.json` |
| Константы | `constants/qualified-agents.ts`, `constants/support-statuses.ts` |
| Конфигурация | `.env.local.example`, `components.json`, `.mcp.json` |

## MCP-серверы

В `.mcp.json` настроены:
1. **shadcn** — добавление/управление shadcn/ui компонентами
2. **context7** — сервис контекста Upstash
