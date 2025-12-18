# План миграции SQL функций в TypeScript

## ✅ МИГРАЦИЯ ЗАВЕРШЕНА (18 декабря 2024)

Миграция `get_detailed_stats_paginated` с SQL RPC на TypeScript Server Action успешно завершена.

### Результаты

- **Производительность**: ~1365ms для 2530 записей (fetching: 1356ms, aggregation: 9ms)
- **Все feature flags удалены** — TypeScript версия теперь единственная
- **SQL функции больше не используются** для detailed stats

---

## Архитектура после миграции

### Текущее состояние

| Функция | Реализация | Файл |
|---------|------------|------|
| `fetchDetailedStatsTS` | TypeScript Server Action | `lib/actions/detailed-stats-actions.ts` |
| `get_request_category_stats` | SQL RPC | Supabase (рассмотреть миграцию) |
| `get_category_distribution` | SQL RPC | Supabase (оставить) |
| `get_filter_options` | SQL RPC | Supabase (оставить) |
| `get_min_created_date` | SQL RPC | Supabase (оставить) |

### Удалённые файлы

- `lib/config/feature-flags.ts` — feature flags больше не нужны
- `lib/supabase/queries-detailed.ts` — старая TS версия с SQL fallback
- `lib/supabase/queries/detailed-stats.ts` — дублирующая реализация

### Обновлённые файлы

- `lib/actions/dashboard-actions.ts` — использует только `fetchDetailedStatsTS`
- `lib/queries/dashboard-queries.ts` — удалена ветка SQL
- `lib/hooks/use-detailed-stats.ts` — упрощён, только TypeScript версия
- `lib/supabase/queries/index.ts` — убран экспорт старых функций

---

## План миграции `get_detailed_stats_paginated`

### Фаза 1: Подготовка (1-2 дня)

#### 1.1 Создать типы и константы

```typescript
// lib/supabase/types/detailed-stats.ts

export type DetailedStatsFilters = {
  dateRange: { from: Date; to: Date }
  versions: string[]
  categories: string[]
  agents: string[]
}

export type DetailedStatsRow = {
  category: string
  version: string
  dates: string | null
  sortOrder: 1 | 2  // 1 = version-level, 2 = week-level
  totalRecords: number
  reviewedRecords: number
  aiErrors: number
  aiQuality: number
  // Legacy classifications
  criticalErrors: number
  meaningfulImprovements: number
  stylisticPreferences: number
  noSignificantChanges: number
  contextShifts: number
  // New classifications (v4.0)
  criticalFactErrors: number
  majorFunctionalOmissions: number
  minorInfoGaps: number
  confusingVerbosity: number
  tonalMisalignments: number
  structuralFixes: number
  stylisticEdits: number
  perfectMatches: number
  exclWorkflowShifts: number
  exclDataDiscrepancies: number
}

export type PaginatedResult<T> = {
  data: T[]
  totalCount: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}
```

#### 1.2 Вынести константы классификаций

```typescript
// constants/classifications.ts

export const LEGACY_CLASSIFICATIONS = {
  CRITICAL_ERROR: 'critical_error',
  MEANINGFUL_IMPROVEMENT: 'meaningful_improvement',
  STYLISTIC_PREFERENCE: 'stylistic_preference',
  NO_SIGNIFICANT_CHANGE: 'no_significant_change',
  CONTEXT_SHIFT: 'context_shift',
} as const

export const NEW_CLASSIFICATIONS = {
  CRITICAL_FACT_ERROR: 'CRITICAL_FACT_ERROR',
  MAJOR_FUNCTIONAL_OMISSION: 'MAJOR_FUNCTIONAL_OMISSION',
  MINOR_INFO_GAP: 'MINOR_INFO_GAP',
  CONFUSING_VERBOSITY: 'CONFUSING_VERBOSITY',
  TONAL_MISALIGNMENT: 'TONAL_MISALIGNMENT',
  STRUCTURAL_FIX: 'STRUCTURAL_FIX',
  STYLISTIC_EDIT: 'STYLISTIC_EDIT',
  PERFECT_MATCH: 'PERFECT_MATCH',
  EXCL_WORKFLOW_SHIFT: 'EXCL_WORKFLOW_SHIFT',
  EXCL_DATA_DISCREPANCY: 'EXCL_DATA_DISCREPANCY',
} as const

// Все классификации, считающиеся как "reviewed"
export const ALL_REVIEWED_CLASSIFICATIONS = [
  ...Object.values(LEGACY_CLASSIFICATIONS),
  ...Object.values(NEW_CLASSIFICATIONS),
] as const

// Mapping: legacy -> new (для отображения в UI)
export const CLASSIFICATION_MAPPING = {
  // AI Errors
  aiErrors: [
    'critical_error', 'meaningful_improvement',
    'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION',
    'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT',
  ],
  // AI Quality
  aiQuality: [
    'no_significant_change', 'stylistic_preference',
    'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH',
  ],
} as const
```

---

### Фаза 2: Реализация Server Action (2-3 дня)

#### 2.1 Создать Server Action

```typescript
// lib/actions/detailed-stats-actions.ts
'use server'

import { supabaseServer } from '@/lib/supabase/server'
import type { DetailedStatsFilters, DetailedStatsRow, PaginatedResult } from '@/lib/supabase/types'
import { countClassifications, getWeekStart, formatDate, extractVersionNumber } from '@/lib/supabase/queries/utils'

const BATCH_SIZE = 1000
const MAX_CONCURRENT_BATCHES = 3

type RawRecord = {
  created_at: string | null
  request_subtype: string | null
  prompt_version: string | null
  change_classification: string | null
}

/**
 * Fetch detailed stats with TypeScript aggregation
 * Replaces SQL function: get_detailed_stats_paginated
 */
export async function fetchDetailedStats(
  filters: DetailedStatsFilters
): Promise<PaginatedResult<DetailedStatsRow>> {
  const startTime = performance.now()

  // Step 1: Get total count for progress tracking
  const countQuery = buildCountQuery(filters)
  const { count, error: countError } = await countQuery

  if (countError) throw new Error(`Count query failed: ${countError.message}`)

  const totalRecords = count || 0
  console.log(`[DetailedStats] Total records to fetch: ${totalRecords}`)

  // Step 2: Fetch in batches
  const records = await fetchInBatches(filters, totalRecords)
  console.log(`[DetailedStats] Fetched ${records.length} records in ${performance.now() - startTime}ms`)

  // Step 3: Aggregate in TypeScript
  const aggregateStart = performance.now()
  const rows = aggregateDetailedStats(records)
  console.log(`[DetailedStats] Aggregated to ${rows.length} rows in ${performance.now() - aggregateStart}ms`)

  // Step 4: Sort results
  const sortedRows = sortDetailedStats(rows)

  console.log(`[DetailedStats] Total time: ${performance.now() - startTime}ms`)

  return {
    data: sortedRows,
    totalCount: sortedRows.length,
    totalPages: 1, // All data returned, pagination is client-side
    currentPage: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  }
}

/**
 * Build count query with filters
 */
function buildCountQuery(filters: DetailedStatsFilters) {
  const { dateRange, versions, categories, agents } = filters

  let query = supabaseServer
    .from('ai_human_comparison')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())

  if (versions.length > 0) query = query.in('prompt_version', versions)
  if (categories.length > 0) query = query.in('request_subtype', categories)
  if (agents.length > 0) query = query.in('email', agents)

  return query
}

/**
 * Fetch records in batches to bypass Supabase limits
 */
async function fetchInBatches(
  filters: DetailedStatsFilters,
  totalRecords: number
): Promise<RawRecord[]> {
  const { dateRange, versions, categories, agents } = filters
  const batches = Math.ceil(totalRecords / BATCH_SIZE)
  const allRecords: RawRecord[] = []

  // Process batches in groups of MAX_CONCURRENT_BATCHES
  for (let i = 0; i < batches; i += MAX_CONCURRENT_BATCHES) {
    const batchPromises = []

    for (let j = i; j < Math.min(i + MAX_CONCURRENT_BATCHES, batches); j++) {
      const offset = j * BATCH_SIZE

      let query = supabaseServer
        .from('ai_human_comparison')
        .select('created_at, request_subtype, prompt_version, change_classification')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .range(offset, offset + BATCH_SIZE - 1)

      if (versions.length > 0) query = query.in('prompt_version', versions)
      if (categories.length > 0) query = query.in('request_subtype', categories)
      if (agents.length > 0) query = query.in('email', agents)

      batchPromises.push(query)
    }

    const results = await Promise.all(batchPromises)

    for (const { data, error } of results) {
      if (error) throw new Error(`Batch fetch failed: ${error.message}`)
      if (data) allRecords.push(...(data as RawRecord[]))
    }
  }

  return allRecords
}

/**
 * Aggregate records into detailed stats rows
 * This replaces the SQL CTE logic
 */
function aggregateDetailedStats(records: RawRecord[]): DetailedStatsRow[] {
  const rows: DetailedStatsRow[] = []

  // Group by category + version (Level 1)
  const versionGroups = new Map<string, {
    category: string
    version: string
    records: RawRecord[]
  }>()

  for (const record of records) {
    const category = record.request_subtype ?? 'unknown'
    const version = record.prompt_version ?? 'unknown'
    const key = `${category}|${version}`

    if (!versionGroups.has(key)) {
      versionGroups.set(key, { category, version, records: [] })
    }
    versionGroups.get(key)!.records.push(record)
  }

  // Process each version group
  for (const group of versionGroups.values()) {
    const classifications = countClassifications(group.records)
    const reviewedRecords = group.records.filter(r => r.change_classification !== null)

    // Level 1: Version-level row
    rows.push({
      category: group.category,
      version: group.version,
      dates: null,
      sortOrder: 1,
      totalRecords: group.records.length,
      reviewedRecords: reviewedRecords.length,
      aiErrors: calculateAiErrors(reviewedRecords),
      aiQuality: calculateAiQuality(reviewedRecords),
      ...classifications,
    })

    // Level 2: Week-level rows
    const weekGroups = new Map<string, RawRecord[]>()

    for (const record of group.records) {
      const weekStart = getWeekStart(new Date(record.created_at ?? new Date()))
      if (!weekGroups.has(weekStart)) {
        weekGroups.set(weekStart, [])
      }
      weekGroups.get(weekStart)!.push(record)
    }

    for (const [weekStart, weekRecords] of weekGroups) {
      const weekClassifications = countClassifications(weekRecords)
      const weekReviewedRecords = weekRecords.filter(r => r.change_classification !== null)

      const weekStartDate = new Date(weekStart)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 6)

      rows.push({
        category: group.category,
        version: group.version,
        dates: `${formatDate(weekStartDate)} — ${formatDate(weekEndDate)}`,
        sortOrder: 2,
        totalRecords: weekRecords.length,
        reviewedRecords: weekReviewedRecords.length,
        aiErrors: calculateAiErrors(weekReviewedRecords),
        aiQuality: calculateAiQuality(weekReviewedRecords),
        ...weekClassifications,
      })
    }
  }

  return rows
}

/**
 * Sort detailed stats rows
 * Order: category ASC, version DESC (newest first), sortOrder ASC, dates DESC
 */
function sortDetailedStats(rows: DetailedStatsRow[]): DetailedStatsRow[] {
  return rows.sort((a, b) => {
    // 1. Category ascending
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }

    // 2. Version descending (newest first)
    if (a.version !== b.version) {
      return extractVersionNumber(b.version) - extractVersionNumber(a.version)
    }

    // 3. Sort order (1 = version-level first, 2 = week-level)
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder
    }

    // 4. Dates descending (newest first)
    if (a.dates && b.dates) {
      return compareDates(b.dates, a.dates)
    }

    return 0
  })
}

/**
 * Compare date strings in DD.MM.YYYY — DD.MM.YYYY format
 */
function compareDates(dateStrA: string, dateStrB: string): number {
  const parseDate = (str: string): Date => {
    const [day, month, year] = str.split(' — ')[0].split('.')
    return new Date(`${year}-${month}-${day}`)
  }
  return parseDate(dateStrA).getTime() - parseDate(dateStrB).getTime()
}

/**
 * Calculate AI errors count
 */
function calculateAiErrors(records: RawRecord[]): number {
  const errorClassifications = [
    'critical_error', 'meaningful_improvement',
    'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION',
    'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT',
  ]
  return records.filter(r =>
    errorClassifications.includes(r.change_classification ?? '')
  ).length
}

/**
 * Calculate AI quality count
 */
function calculateAiQuality(records: RawRecord[]): number {
  const qualityClassifications = [
    'no_significant_change', 'stylistic_preference',
    'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH',
  ]
  return records.filter(r =>
    qualityClassifications.includes(r.change_classification ?? '')
  ).length
}
```

#### 2.2 Обновить React Query hook

```typescript
// lib/queries/detailed-stats-queries.ts

import { useQuery } from '@tanstack/react-query'
import { fetchDetailedStats } from '@/lib/actions/detailed-stats-actions'
import type { DetailedStatsFilters } from '@/lib/supabase/types'

export function useDetailedStats(filters: DetailedStatsFilters) {
  return useQuery({
    queryKey: ['detailed-stats', filters],
    queryFn: () => fetchDetailedStats(filters),
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
    retry: 2,
    retryDelay: 1000,
  })
}
```

---

### Фаза 3: Тестирование и сравнение (1-2 дня)

#### 3.1 Создать тесты

```typescript
// __tests__/detailed-stats.test.ts

import { aggregateDetailedStats, sortDetailedStats } from '@/lib/actions/detailed-stats-actions'

describe('DetailedStats Aggregation', () => {
  const mockRecords = [
    { created_at: '2024-01-15', request_subtype: 'category_a', prompt_version: 'v2', change_classification: 'PERFECT_MATCH' },
    { created_at: '2024-01-15', request_subtype: 'category_a', prompt_version: 'v2', change_classification: 'CRITICAL_FACT_ERROR' },
    { created_at: '2024-01-08', request_subtype: 'category_a', prompt_version: 'v1', change_classification: null },
  ]

  test('groups by category and version', () => {
    const result = aggregateDetailedStats(mockRecords)

    // Should have version-level rows + week-level rows
    expect(result.length).toBeGreaterThan(0)

    // Check version-level row exists
    const versionRow = result.find(r => r.sortOrder === 1 && r.version === 'v2')
    expect(versionRow).toBeDefined()
    expect(versionRow?.totalRecords).toBe(2)
  })

  test('counts classifications correctly', () => {
    const result = aggregateDetailedStats(mockRecords)
    const versionRow = result.find(r => r.sortOrder === 1 && r.version === 'v2')

    expect(versionRow?.perfectMatches).toBe(1)
    expect(versionRow?.criticalFactErrors).toBe(1)
  })

  test('sorts correctly', () => {
    const rows = aggregateDetailedStats(mockRecords)
    const sorted = sortDetailedStats(rows)

    // Version-level rows should come before week-level for same category/version
    const v2Rows = sorted.filter(r => r.version === 'v2')
    expect(v2Rows[0].sortOrder).toBe(1)
  })
})
```

#### 3.2 Сравнить производительность

```typescript
// scripts/compare-performance.ts

import { fetchDetailedStats } from '@/lib/actions/detailed-stats-actions'
import { getDetailedStatsPaginated } from '@/lib/supabase/queries/detailed-stats'

async function comparePerformance() {
  const filters = {
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-03-01')
    },
    versions: [],
    categories: [],
    agents: [],
  }

  // Test SQL version
  console.log('Testing SQL RPC function...')
  const sqlStart = performance.now()
  const sqlResult = await getDetailedStatsPaginated(filters)
  const sqlTime = performance.now() - sqlStart
  console.log(`SQL: ${sqlTime}ms, ${sqlResult.data.length} rows`)

  // Test TypeScript version
  console.log('Testing TypeScript aggregation...')
  const tsStart = performance.now()
  const tsResult = await fetchDetailedStats(filters)
  const tsTime = performance.now() - tsStart
  console.log(`TypeScript: ${tsTime}ms, ${tsResult.data.length} rows`)

  // Compare results
  console.log(`\nPerformance difference: ${((tsTime - sqlTime) / sqlTime * 100).toFixed(1)}%`)
  console.log(`Rows match: ${sqlResult.data.length === tsResult.data.length}`)
}

comparePerformance()
```

---

### Фаза 4: Миграция (1 день)

#### 4.1 Feature flag для постепенного перехода

```typescript
// lib/config/feature-flags.ts

export const FEATURE_FLAGS = {
  USE_TYPESCRIPT_DETAILED_STATS: process.env.NEXT_PUBLIC_USE_TS_DETAILED_STATS === 'true',
}
```

```typescript
// lib/queries/detailed-stats-queries.ts

import { FEATURE_FLAGS } from '@/lib/config/feature-flags'
import { fetchDetailedStats } from '@/lib/actions/detailed-stats-actions'
import { getDetailedStatsPaginated } from '@/lib/supabase/queries/detailed-stats'

export function useDetailedStats(filters: DetailedStatsFilters) {
  return useQuery({
    queryKey: ['detailed-stats', filters, FEATURE_FLAGS.USE_TYPESCRIPT_DETAILED_STATS],
    queryFn: () => {
      if (FEATURE_FLAGS.USE_TYPESCRIPT_DETAILED_STATS) {
        return fetchDetailedStats(filters)
      }
      return getDetailedStatsPaginated(filters)
    },
    // ... rest of config
  })
}
```

#### 4.2 План деплоя

1. **День 1**: Деплой с feature flag = false (старое поведение)
2. **День 2-3**: Включить flag для 10% пользователей, мониторить
3. **День 4-5**: Увеличить до 50%, сравнить метрики
4. **День 6-7**: 100% трафика на TypeScript версию
5. **Неделя 2**: Удалить SQL функцию из Supabase

---

## Оценка рисков

### Производительность

| Сценарий | SQL RPC | TypeScript | Разница |
|----------|---------|------------|---------|
| 1K записей | ~50ms | ~80ms | +60% |
| 10K записей | ~200ms | ~300ms | +50% |
| 50K записей | ~800ms | ~1200ms | +50% |

**Вывод**: TypeScript версия будет ~50% медленнее, но всё ещё в пределах допустимого (<2 сек).

### Митигация рисков

1. **Кэширование**: React Query уже настроен (2 мин staleTime)
2. **Batching**: Параллельные запросы по 1000 записей
3. **Fallback**: Feature flag позволяет откатиться за секунды

---

## Что НЕ мигрировать

### Оставить в SQL:

1. **`get_category_distribution`**
   - Простая агрегация COUNT + GROUP BY
   - Нет сложной логики
   - ~30 строк SQL

2. **`get_filter_options`**
   - Получение уникальных значений (DISTINCT)
   - Быстрее делать в SQL

3. **`get_min_created_date`**
   - Одно значение MIN()
   - Нет смысла тянуть в TypeScript

---

## Чеклист миграции (ЗАВЕРШЁН)

- [x] Создать типы в `lib/supabase/types/detailed-stats.ts` ✅ (уже существовали в types.ts)
- [x] Вынести константы классификаций в `constants/classifications.ts` ✅ (добавлены AI_ERROR/QUALITY хелперы)
- [x] Реализовать Server Action в `lib/actions/detailed-stats-actions.ts` ✅
- [x] Добавить feature flag ✅ (временно, удалён после тестирования)
- [x] Обновить React Query hook ✅ (`lib/hooks/use-detailed-stats.ts`)
- [x] Протестировать на production ✅
- [x] Удалить feature flag и старый код ✅ (18.12.2024)

### Итоговая структура файлов

**Основной файл:**
- `lib/actions/detailed-stats-actions.ts` - TypeScript Server Action с батчевой загрузкой и агрегацией

**Обновлённые файлы:**
- `lib/actions/dashboard-actions.ts` - использует `fetchDetailedStatsTS`
- `lib/queries/dashboard-queries.ts` - упрощён, только TS версия
- `lib/hooks/use-detailed-stats.ts` - упрощён, только TS версия
- `lib/supabase/queries/index.ts` - убран экспорт старых функций
- `constants/classification-types.ts` - добавлены AI_ERROR/QUALITY хелперы

**Удалённые файлы:**
- `lib/config/feature-flags.ts`
- `lib/supabase/queries-detailed.ts`
- `lib/supabase/queries/detailed-stats.ts`

---

## Следующие шаги после успешной миграции

1. **Рассмотреть миграцию `get_request_category_stats`**
   - 4 CTE с percentiles
   - Сложная логика multi-category
   - ~100 строк SQL

2. **Документировать SQL функции, которые остаются**
   - Добавить в git как `.sql` файлы
   - Настроить Supabase migrations

3. **Улучшить тестирование**
   - Integration tests с реальной БД
   - Performance benchmarks в CI

---

## Ссылки

- [Текущая SQL функция](SQL-RPC/update-sql-function.sql)
- [TypeScript версия (существующая)](lib/supabase/queries/detailed-stats.ts)
- [Утилиты для классификаций](lib/supabase/queries/utils.ts)
- [Performance документация](PERFORMANCE.md)
