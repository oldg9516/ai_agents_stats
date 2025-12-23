# План оптимизации AI Agent Stats Dashboard

> Дата создания: 2024-12-22
> Автор: Claude Code Audit

## Обзор аудита

Комплексный аудит выявил **35+ проблем** производительности и архитектуры:
- Data Fetching & Queries: 12 проблем
- React Components Performance: 10 проблем
- State Management & Architecture: 13 проблем

**Ожидаемые результаты после оптимизации:**
- Время загрузки: -40-60%
- Ненужные ре-рендеры: -50-70%
- Bundle size: -10-15KB

---

## Фаза 1: Критические исправления

### 1.1 [x] Удалить exposed API key из .mcp.json
**Файл:** `.mcp.json`
**Проблема:** API ключ Upstash открыт в репозитории
**Решение:** Удалить ключ, использовать environment variable

### 1.2 [x] Добавить timeout на Server Actions
**Файлы:**
- `lib/actions/dashboard-actions.ts`
- `lib/actions/support-actions.ts`

**Проблема:** Запросы могут висеть бесконечно без timeout
**Решение:** Добавить Promise.race с 30s timeout:
```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Request timeout')), 30000)
)
await Promise.race([dataPromise, timeoutPromise])
```

### 1.3 [x] Заменить limit(50000) на batch fetching
**Файлы:**
- `lib/supabase/queries/charts.ts:42,164`

**Проблема:** Потенциальная потеря данных если записей >50000
**Решение:** Использовать существующую batch-логику или создать универсальную

### 1.4 [x] Исправить обработку ошибок в batch-функциях
**Файл:** `lib/supabase/queries-support/threads.ts:56`
**Проблема:** Ошибки логируются, но не пробрасываются - данные могут быть неполными
**Решение:** Пробросить ошибки вверх, добавить retry логику

---

## Фаза 2: Производительность запросов

### 2.1 [x] Создать единую batch-fetch утилиту
**Проблема:** 250+ строк дублирующегося кода в 3 файлах
**Файлы с дублированием:**
- `lib/supabase/queries-support/kpi.ts` (fetchAllForKPIs)
- `lib/supabase/queries-support/charts.ts` (fetchAllInBatches)
- `lib/supabase/queries-category.ts` (fetchAllForCategory)

**Решение:** Создать `lib/supabase/helpers/batch-fetch.ts`:
```typescript
export async function fetchAllInBatchesGeneric<T>(
  supabase: SupabaseClient,
  tableName: string,
  selectFields: string,
  filters: Record<string, any>,
  options?: { batchSize?: number; maxConcurrent?: number }
): Promise<T[]>
```

### 2.2 [x] Заменить SELECT * на SELECT id в count queries
**Файлы:**
- `lib/supabase/queries-support/kpi.ts:30,181-182`
- `lib/supabase/queries-support/charts.ts:35,162`
- `lib/supabase/queries-category.ts:37`
- `lib/actions/detailed-stats-actions.ts:136`

**Решение:** `select('id', { count: 'exact', head: true })`

### 2.3 [x] Унифицировать cache settings
**Файлы:**
- `lib/queries/dashboard-queries.ts`
- `lib/queries/support-queries.ts`

**Проблема:** Разные gcTime (15 vs 30 мин)
**Решение:** Создать константы:
```typescript
const CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000,  // 5 мин
  gcTime: 20 * 60 * 1000,    // 20 мин
}
```

### 2.4 [ ] Создать SQL RPC для support threads (опционально)
**Файл:** `lib/supabase/queries-support/threads.ts:231-299`
**Проблема:** 4-5 отдельных запросов вместо одного JOIN
**Решение:** Создать RPC `get_support_threads_with_details` (если будет время)

---

## Фаза 3: React оптимизация

### 3.1 [x] Добавить React.memo на компоненты
**Файлы:**
- `components/kpi/kpi-card.tsx`
- `components/kpi/average-quality-card.tsx`
- `components/kpi/best-category-card.tsx`
- `components/kpi/total-records-card.tsx`
- `components/charts/version-bar-chart.tsx`
- `components/charts/quality-trends-chart.tsx`
- `components/charts/category-pie-chart.tsx`

**Решение:**
```typescript
export const KPICard = React.memo(function KPICard({ data }) {
  // ...
})
```

### 3.2 [x] Добавить useCallback для обработчиков событий
**Файлы:**
- `components/tables/detailed-stats/detailed-stats-table.tsx` (handleScoreGroupClick)
- `components/filters/multi-select-filter.tsx` (handleChange, handleToggle, handleSelectAll)
- `components/charts/category-pie-chart.tsx` (handleCategoryClick)
- `components/charts/quality-trends-chart.tsx` (toggleCategory)

**Решение:**
```typescript
const handleClick = useCallback((params) => {
  // ...
}, [dependencies])
```

### 3.3 [ ] Исправить dependency arrays в useEffect
**Файлы:**
- `components/filters/filter-bar.tsx:64` - добавить filters, onFiltersChange
- `components/charts/quality-trends-chart.tsx:94-97` - исправить infinite loop риск

### 3.4 [ ] Добавить виртуализацию в таблицы (опционально)
**Файлы:**
- `components/tables/detailed-stats/detailed-stats-table.tsx`
- `components/filters/multi-select-filter.tsx`

**Решение:** Использовать @tanstack/react-virtual для списков >100 элементов

### 3.5 [x] Добавить динамический импорт модалей
**Файл:** `components/tables/detailed-stats/detailed-stats-table.tsx:20`
**Решение:**
```typescript
const ScoreGroupModal = dynamic(
  () => import('@/components/score-group-modal'),
  { loading: () => null }
)
```

### 3.6 [x] Добавить динамический импорт чартов
**Файлы:**
- `components/dashboard-content.tsx`
- `components/support-overview-content.tsx`

**Проблема:** Recharts (~464 KiB) загружается сразу при открытии страницы
**Решение:** Использовать `next/dynamic` с `ssr: false` для всех чарт-компонентов:
```typescript
const QualityTrendsChart = dynamic(
  () => import('./charts/quality-trends-chart').then(mod => ({ default: mod.QualityTrendsChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)
```

---

## Фаза 4: Архитектурные улучшения

### 4.1 [x] Исправить QueryClient конфигурацию
**Файл:** `lib/providers/query-provider.tsx`
**Проблемы:**
- `refetchOnWindowFocus: true` слишком агрессивно
- `staleTime: 60 * 1000` не соответствует CLAUDE.md

**Решение:**
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
})
```

### 4.2 [ ] Создать centralized query keys
**Новый файл:** `lib/queries/query-keys.ts`
```typescript
export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    data: (filters) => [...queryKeys.dashboard.all, filters] as const,
  },
  support: {
    all: ['support'] as const,
    data: (filters) => [...queryKeys.support.all, filters] as const,
  },
}
```

### 4.3 [ ] Рефакторинг date validation
**Файл:** `lib/store/index.ts:112-226`
**Проблема:** 4 одинаковых блока проверки дат
**Решение:** Создать `lib/utils/validate-date-range.ts`

### 4.4 [ ] Разделить Zustand store (в конце)
**Файл:** `lib/store/index.ts`
**Проблема:** 4 слайса в одном store - изменение одного триггерит все
**Решение:** Создать отдельные stores:
- `lib/store/dashboard-store.ts`
- `lib/store/support-store.ts`
- `lib/store/tickets-review-store.ts`
- `lib/store/backlog-reports-store.ts`

---

## Фаза 5: Финальные улучшения

### 5.1 [x] Оптимизировать next.config.ts
**Файл:** `next.config.ts`
**Добавить:**
```typescript
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  optimizePackageImports: [
    '@radix-ui/react-dialog',
    '@nivo/sankey',
    '@nivo/heatmap',
  ],
}
```

### 5.2 [x] Улучшить font loading
**Файл:** `app/[locale]/layout.tsx`
**Решение:** Добавить `display: 'swap'`:
```typescript
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})
```

### 5.3 [ ] Добавить HydrationGuard (опционально)
**Файл:** `app/[locale]/layout.tsx:43`
**Проблема:** `suppressHydrationWarning` скрывает ошибки
**Решение:** Создать компонент HydrationGuard

---

## Критические файлы для модификации

### Data Layer
- `lib/supabase/queries/charts.ts`
- `lib/supabase/queries-support/kpi.ts`
- `lib/supabase/queries-support/charts.ts`
- `lib/supabase/queries-support/threads.ts`
- `lib/supabase/queries-category.ts`
- `lib/actions/dashboard-actions.ts`
- `lib/actions/support-actions.ts`

### React Components
- `components/kpi/*.tsx`
- `components/charts/*.tsx`
- `components/tables/detailed-stats/detailed-stats-table.tsx`
- `components/filters/multi-select-filter.tsx`
- `components/filters/filter-bar.tsx`

### State & Config
- `lib/store/index.ts`
- `lib/providers/query-provider.tsx`
- `lib/queries/dashboard-queries.ts`
- `lib/queries/support-queries.ts`
- `.mcp.json`
- `next.config.ts`
- `app/[locale]/layout.tsx`

### Новые файлы
- `lib/supabase/helpers/batch-fetch.ts`
- `lib/queries/query-keys.ts`
- `lib/utils/validate-date-range.ts`

---

## Прогресс выполнения

| Фаза | Задач | Выполнено | Статус |
|------|-------|-----------|--------|
| 1. Критические | 4 | 4 | ✅ |
| 2. Запросы | 4 | 3 | ✅ |
| 3. React | 6 | 4 | ⏳ |
| 4. Архитектура | 4 | 1 | ⏳ |
| 5. Финальные | 3 | 2 | ⏳ |
| **Итого** | **21** | **14** | **67%** |
