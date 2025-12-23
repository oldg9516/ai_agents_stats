# Dashboard SQL Queries Documentation

Документация всех SQL-запросов и логики расчётов для главного дашборда.

## Архитектура данных

### Основная таблица: `ai_human_comparison`

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | bigint | Auto-increment ID |
| `created_at` | timestamp | Дата создания записи |
| `request_subtype` | text | Категория запроса |
| `prompt_version` | text | Версия промпта (v1, v2, v3...) |
| `email` | text | Email агента, обработавшего запрос |
| `changed` | boolean | Изменил ли человек ответ AI |
| `change_classification` | text | Тип изменения |
| `status` | text | Статус записи |

### Классификации изменений

**Legacy классификации:**
- `critical_error` — критическая ошибка AI
- `meaningful_improvement` — значимое улучшение
- `stylistic_preference` — стилистическое предпочтение
- `no_significant_change` — без значимых изменений
- `context_shift` — смена контекста (исключается из расчёта качества)

**Новые классификации:**
- `CRITICAL_FACT_ERROR` — критическая фактическая ошибка
- `MAJOR_FUNCTIONAL_OMISSION` — значительное функциональное упущение
- `MINOR_INFO_GAP` — незначительный информационный пробел
- `CONFUSING_VERBOSITY` — путающая многословность
- `TONAL_MISALIGNMENT` — несоответствие тона
- `STRUCTURAL_FIX` — структурное исправление
- `STYLISTIC_EDIT` — стилистическая правка
- `PERFECT_MATCH` — идеальное совпадение
- `EXCL_WORKFLOW_SHIFT` — смена рабочего процесса (исключается)
- `EXCL_DATA_DISCREPANCY` — несоответствие данных (исключается)

---

## 1. KPI Data Query

**Файл:** `lib/supabase/queries/kpi.ts`

### Запрос текущего периода

```sql
SELECT changed, request_subtype, change_classification, status
FROM ai_human_comparison
WHERE created_at >= :dateFrom
  AND created_at <= :dateTo
  AND (prompt_version = ANY(:versions) OR :versions IS NULL)
  AND (request_subtype = ANY(:categories) OR :categories IS NULL)
  AND (email = ANY(:agents) OR :agents IS NULL)
```

### Запрос предыдущего периода

```sql
-- Тот же запрос, но с датами предыдущего периода
-- previousFrom = dateFrom - (dateTo - dateFrom)
-- previousTo = dateFrom
SELECT changed, request_subtype, change_classification, status
FROM ai_human_comparison
WHERE created_at >= :previousFrom
  AND created_at <= :previousTo
  AND (prompt_version = ANY(:versions) OR :versions IS NULL)
  AND (request_subtype = ANY(:categories) OR :categories IS NULL)
  AND (email = ANY(:agents) OR :agents IS NULL)
```

### Запрос записей с изменениями (для классификаций)

```sql
SELECT change_classification
FROM ai_human_comparison
WHERE created_at >= :dateFrom
  AND created_at <= :dateTo
  AND status = 'compared'
  AND change_classification IS NOT NULL
  AND change_classification != 'context_shift'
  AND (prompt_version = ANY(:versions) OR :versions IS NULL)
  AND (request_subtype = ANY(:categories) OR :categories IS NULL)
  AND (email = ANY(:agents) OR :agents IS NULL)
```

### Расчёт KPI (TypeScript)

```typescript
// Общее количество записей
totalRecords = records.length

// Проверенные записи (есть классификация)
reviewedRecords = records.filter(r => r.change_classification !== null)

// Оцениваемые записи (исключая context_shift)
evaluableRecords = reviewedRecords.filter(
  r => r.change_classification !== 'context_shift'
)

// Качество AI (записи без изменений / оцениваемые)
unchangedRecords = evaluableRecords.filter(r =>
  r.change_classification === 'no_significant_change' ||
  r.change_classification === 'stylistic_preference' ||
  r.change_classification === 'PERFECT_MATCH' ||
  r.change_classification === 'STYLISTIC_EDIT'
)
qualityPercentage = (unchangedRecords.length / evaluableRecords.length) * 100

// Тренд
trend = ((current - previous) / previous) * 100
```

---

## 2. Quality Trends Chart Query

**Файл:** `lib/supabase/queries/charts.ts`

### SQL запрос

```sql
SELECT request_subtype, created_at, changed, change_classification
FROM ai_human_comparison
WHERE created_at >= :dateFrom
  AND created_at <= :dateTo
  AND change_classification IS NOT NULL  -- Только проверенные записи
  AND (prompt_version = ANY(:versions) OR :versions IS NULL)
  AND (request_subtype = ANY(:categories) OR :categories IS NULL)
  AND (email = ANY(:agents) OR :agents IS NULL)
LIMIT 50000
```

### Агрегация (TypeScript)

```typescript
// Фильтруем context_shift
const filtered = data.filter(r => r.change_classification !== 'context_shift')

// Группировка по категории и периоду (день или неделя)
const groupBy = dateRangeDays <= 14 ? 'day' : 'week'

// Для каждой группы
goodPercentage = (unchangedCount / totalCount) * 100
// unchanged = changed === false
```

### Результат

```typescript
interface QualityTrendData {
  category: string      // request_subtype
  weekStart: string     // ISO дата начала периода
  goodPercentage: number // Процент качества
}
```

---

## 3. Category Distribution Chart Query

**Файл:** `lib/supabase/queries/charts.ts`
**RPC функция:** `get_category_distribution()`

### SQL (RPC функция)

```sql
CREATE OR REPLACE FUNCTION get_category_distribution(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL
)
RETURNS TABLE (
  category text,
  total_records bigint,
  unchanged_records bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    request_subtype AS category,
    COUNT(*)::bigint AS total_records,
    COUNT(*) FILTER (
      WHERE changed = false
      AND change_classification IS NOT NULL
      AND change_classification != 'context_shift'
    )::bigint AS unchanged_records
  FROM ai_human_comparison
  WHERE created_at >= p_from_date
    AND created_at <= p_to_date
    AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    AND (p_categories IS NULL OR request_subtype = ANY(p_categories))
    AND (p_agents IS NULL OR email = ANY(p_agents))
  GROUP BY request_subtype
  ORDER BY total_records DESC;
END;
$$;
```

### Расчёт качества (TypeScript)

```typescript
goodPercentage = (unchangedRecords / totalRecords) * 100
```

---

## 4. Version Comparison Chart Query

**Файл:** `lib/supabase/queries/charts.ts`

### SQL запрос

```sql
SELECT prompt_version, changed, change_classification
FROM ai_human_comparison
WHERE created_at >= :dateFrom
  AND created_at <= :dateTo
  AND (prompt_version = ANY(:versions) OR :versions IS NULL)
  AND (request_subtype = ANY(:categories) OR :categories IS NULL)
  AND (email = ANY(:agents) OR :agents IS NULL)
LIMIT 50000
```

### Агрегация (TypeScript)

```typescript
// Фильтруем context_shift
const filtered = data.filter(r => r.change_classification !== 'context_shift')

// Группировка по версии
const byVersion = groupBy(filtered, 'prompt_version')

// Для каждой версии
goodPercentage = (unchangedCount / totalCount) * 100

// Сортировка по номеру версии (v3 > v2 > v1)
versions.sort((a, b) => extractVersionNumber(b) - extractVersionNumber(a))
```

---

## 5. Filter Options Query

**Файл:** `lib/supabase/queries/filters.ts`
**RPC функция:** `get_filter_options()`

### SQL (RPC функция)

```sql
CREATE OR REPLACE FUNCTION get_filter_options(
  p_from_date timestamp with time zone DEFAULT NULL,
  p_to_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  versions text[],
  categories text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Уникальные версии
    ARRAY(
      SELECT DISTINCT prompt_version
      FROM ai_human_comparison
      WHERE prompt_version IS NOT NULL
        AND (p_from_date IS NULL OR created_at >= p_from_date)
        AND (p_to_date IS NULL OR created_at <= p_to_date)
      ORDER BY prompt_version
    ) AS versions,
    -- Уникальные категории
    ARRAY(
      SELECT DISTINCT request_subtype
      FROM ai_human_comparison
      WHERE request_subtype IS NOT NULL
        AND (p_from_date IS NULL OR created_at >= p_from_date)
        AND (p_to_date IS NULL OR created_at <= p_to_date)
      ORDER BY request_subtype
    ) AS categories;
END;
$$;
```

### Запрос агентов (TypeScript через Supabase)

```sql
SELECT DISTINCT email
FROM ai_human_comparison
WHERE (created_at >= :dateFrom OR :dateFrom IS NULL)
  AND (created_at <= :dateTo OR :dateTo IS NULL)
ORDER BY email
```

---

## 6. Min Created Date Query

**Файл:** `lib/supabase/queries/filters.ts`
**RPC функция:** `get_min_created_date()`

### SQL (RPC функция)

```sql
CREATE OR REPLACE FUNCTION get_min_created_date()
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_date timestamp with time zone;
BEGIN
  SELECT MIN(created_at) INTO min_date
  FROM ai_human_comparison;

  -- Возвращаем дефолт если нет записей
  RETURN COALESCE(min_date, '2020-01-01'::timestamp with time zone);
END;
$$;
```

---

## 7. Detailed Stats Table Query

**Файл:** `lib/actions/detailed-stats-actions.ts`

### SQL запрос (батчами по 1000 записей)

```sql
SELECT created_at, request_subtype, prompt_version, change_classification
FROM ai_human_comparison
WHERE created_at >= :dateFrom
  AND created_at <= :dateTo
  AND (prompt_version = ANY(:versions) OR :versions IS NULL)
  AND (request_subtype = ANY(:categories) OR :categories IS NULL)
  AND (email = ANY(:agents) OR :agents IS NULL)
ORDER BY created_at DESC
LIMIT 1000 OFFSET :offset
```

### Агрегация (TypeScript)

```typescript
// Группировка Level 1: по категории + версии
const versionLevel = groupBy(data, r => `${r.request_subtype}|${r.prompt_version}`)

// Группировка Level 2: по категории + версии + неделе
const weekLevel = groupBy(data, r => {
  const weekStart = getWeekStart(r.created_at)
  return `${r.request_subtype}|${r.prompt_version}|${weekStart}`
})

// Для каждой группы подсчитываем
interface GroupStats {
  totalRecords: number
  reviewedRecords: number  // change_classification IS NOT NULL
  aiErrors: number         // critical_error + CRITICAL_FACT_ERROR + MAJOR_FUNCTIONAL_OMISSION
  aiQuality: number        // (evaluable - aiErrors) / evaluable * 100

  // Классификации (legacy + new)
  criticalErrors: number
  meaningfulImprovements: number
  stylisticPreferences: number
  noSignificantChanges: number
  contextShifts: number

  // Новые классификации
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
```

### Маппинг классификаций

| Метрика | Legacy | New |
|---------|--------|-----|
| AI Errors | `critical_error` | `CRITICAL_FACT_ERROR`, `MAJOR_FUNCTIONAL_OMISSION` |
| Meaningful Improvements | `meaningful_improvement` | `MINOR_INFO_GAP`, `CONFUSING_VERBOSITY`, `TONAL_MISALIGNMENT` |
| Stylistic Preferences | `stylistic_preference` | `STRUCTURAL_FIX`, `STYLISTIC_EDIT` |
| No Significant Changes | `no_significant_change` | `PERFECT_MATCH` |
| Context Shifts (excluded) | `context_shift` | `EXCL_WORKFLOW_SHIFT`, `EXCL_DATA_DISCREPANCY` |

---

## Формула расчёта качества AI

```
AI Quality % = (Unchanged Records / Evaluable Records) × 100

где:
  Unchanged Records = записи с классификацией:
    - no_significant_change
    - stylistic_preference
    - PERFECT_MATCH
    - STYLISTIC_EDIT

  Evaluable Records = Reviewed Records - Context Shifts

  Reviewed Records = записи где change_classification IS NOT NULL

  Context Shifts = записи с классификацией:
    - context_shift
    - EXCL_WORKFLOW_SHIFT
    - EXCL_DATA_DISCREPANCY
```

---

## Настройки кэширования (React Query)

| Параметр | Значение | Описание |
|----------|----------|----------|
| `staleTime` | 2 минуты | Данные считаются свежими |
| `gcTime` | 10 минут | Данные хранятся в кэше |
| `retry` | 2 | Количество повторных попыток |
| `retryDelay` | 1 секунда | Задержка между попытками |
| `timeout` | 30 секунд | Таймаут запроса |

---

## Real-time обновления

Supabase Realtime подписка на таблицу `ai_human_comparison`:
- Слушает события: `INSERT`, `UPDATE`, `DELETE`
- При изменении инвалидирует все dashboard queries
- Вызывает `router.refresh()` для обновления страницы

---

## Файловая структура

```
lib/
├── actions/
│   ├── dashboard-actions.ts      # Server Actions (entry points)
│   └── detailed-stats-actions.ts # Detailed stats aggregation
├── supabase/
│   └── queries/
│       ├── kpi.ts               # KPI calculations
│       ├── charts.ts            # Chart data queries
│       └── filters.ts           # Filter options + min date
├── queries/
│   └── dashboard-queries.ts     # React Query hooks + caching
└── hooks/
    └── use-dashboard-data.ts    # Custom hook for dashboard

SQL-RPC/
├── fix-search-path-security.sql       # RPC: get_filter_options, get_min_created_date
└── update-category-distribution.sql   # RPC: get_category_distribution
```
