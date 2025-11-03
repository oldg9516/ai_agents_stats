# Dashboard Calculations Documentation

Полная документация по расчету всех метрик, KPI и графиков на дашборде AI Agent Statistics.

## Содержание

1. [Основные принципы](#основные-принципы)
2. [KPI Cards (4 карточки)](#kpi-cards-4-карточки)
3. [Quality Trends Chart](#quality-trends-chart)
4. [Category Distribution (Pie Chart)](#category-distribution-pie-chart)
5. [Version Comparison (Bar Chart)](#version-comparison-bar-chart)
6. [Detailed Stats Table](#detailed-stats-table)
7. [Тренды и сравнения периодов](#тренды-и-сравнения-периодов)

---

## Основные принципы

### База данных

**Таблица**: `ai_human_comparison`

**Поля**:
- `id` - уникальный идентификатор записи
- `request_subtype` - категория запроса (например, "shipping_question")
- `prompt_version` - версия промпта (v1, v2, v3, etc.)
- `created_at` - дата создания записи
- `email` - email агента, который обработал запрос
- `changed` - **boolean** - был ли AI-ответ отредактирован человеком

### Ключевая метрика качества

**Quality Percentage (Процент качества)** = процент записей, которые НЕ были изменены квалифицированными агентами.

```typescript
qualityPercentage = (unchangedRecords / totalRecordsByQualifiedAgents) × 100
```

**Логика**:
- `changed = false` → AI сгенерировал **хороший** ответ (100% качества)
- `changed = true` → AI сгенерировал **плохой** ответ, требует правки (0% качества)

### Квалифицированные агенты

Только записи, обработанные **квалифицированными агентами** (`constants/qualified-agents.ts`), участвуют в расчете качества.

```typescript
// Пример фильтра
WHERE email IN ('agent1@example.com', 'agent2@example.com', ...)
```

### Фильтры

Все расчеты учитывают активные фильтры:
- **Date Range** - диапазон дат (`created_at`)
- **Versions** - версии промптов (`prompt_version`)
- **Categories** - категории запросов (`request_subtype`)
- **Agents** - конкретные агенты (`email`)

---

## KPI Cards (4 карточки)

### 1. Total Records (Всего записей)

**Что показывает**: Общее количество записей за период.

**Расчет**:
```sql
SELECT COUNT(*) as total
FROM ai_human_comparison
WHERE created_at BETWEEN :dateFrom AND :dateTo
  AND email IN (:qualifiedAgents)
  [AND filters...]
```

**Тренд**: Сравнение с предыдущим периодом равной длительности.

**Код**: [`lib/supabase/queries.ts:getKPIData()`](lib/supabase/queries.ts#L50-L150)

---

### 2. Average Quality (Средний процент качества)

**Что показывает**: Средний процент качества AI по всем категориям.

**Расчет (2 шага)**:

**Шаг 1**: Рассчитываем качество для каждой категории:
```sql
SELECT
  request_subtype,
  COUNT(*) FILTER (WHERE changed = false) * 100.0 / COUNT(*) as quality_pct
FROM ai_human_comparison
WHERE email IN (:qualifiedAgents)
  AND created_at BETWEEN :dateFrom AND :dateTo
GROUP BY request_subtype
```

**Шаг 2**: Усредняем по всем категориям:
```typescript
averageQuality = sum(quality_pct) / numberOfCategories
```

**Пример**:
```
Category A: 80% (8/10 не изменены)
Category B: 60% (6/10 не изменены)
Category C: 90% (9/10 не изменены)

Average Quality = (80 + 60 + 90) / 3 = 76.67%
```

**Тренд**: Сравнение с предыдущим периодом.

**Код**: [`lib/supabase/queries.ts:getKPIData()`](lib/supabase/queries.ts#L50-L150)

---

### 3. Best Category (Лучшая категория)

**Что показывает**: Категория с наивысшим процентом качества.

**Расчет**:
```sql
SELECT
  request_subtype as category,
  COUNT(*) FILTER (WHERE changed = false) * 100.0 / COUNT(*) as quality_pct
FROM ai_human_comparison
WHERE email IN (:qualifiedAgents)
  AND created_at BETWEEN :dateFrom AND :dateTo
GROUP BY request_subtype
ORDER BY quality_pct DESC
LIMIT 1
```

**Тренд**: Сравнение процента качества этой категории с предыдущим периодом.

**Код**: [`lib/supabase/queries.ts:getKPIData()`](lib/supabase/queries.ts#L50-L150)

---

### 4. Records Changed (Записей изменено)

**Что показывает**: Количество записей, которые были изменены (плохое качество AI).

**Расчет**:
```sql
SELECT COUNT(*) as changed_count
FROM ai_human_comparison
WHERE email IN (:qualifiedAgents)
  AND created_at BETWEEN :dateFrom AND :dateTo
  AND changed = true
  [AND filters...]
```

**Тренд**: Сравнение с предыдущим периодом.

**Код**: [`lib/supabase/queries.ts:getKPIData()`](lib/supabase/queries.ts#L50-L150)

---

## Quality Trends Chart

**Что показывает**: Динамика качества AI по неделям для каждой категории.

**Тип графика**: Line chart (multi-series)

**Расчет**:
```sql
SELECT
  request_subtype as category,
  DATE_TRUNC('week', created_at) as week_start,
  COUNT(*) FILTER (WHERE changed = false AND email IN (:qualifiedAgents)) * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE email IN (:qualifiedAgents)), 0) as good_percentage
FROM ai_human_comparison
WHERE created_at BETWEEN :dateFrom AND :dateTo
GROUP BY request_subtype, DATE_TRUNC('week', created_at)
ORDER BY week_start ASC, request_subtype
```

**Структура данных**:
```typescript
[
  {
    category: "shipping_question",
    weekStart: "2024-01-01",
    goodPercentage: 85.5
  },
  {
    category: "shipping_question",
    weekStart: "2024-01-08",
    goodPercentage: 87.2
  },
  {
    category: "account_issue",
    weekStart: "2024-01-01",
    goodPercentage: 72.3
  },
  ...
]
```

**Визуализация**:
- **X-axis**: Недели (weekStart)
- **Y-axis**: Процент качества (0-100%)
- **Lines**: Отдельная линия для каждой категории
- **Colors**: Автоматически из CSS переменных `--chart-1` до `--chart-5`

**Код**:
- Запрос: [`lib/supabase/queries.ts:getQualityTrends()`](lib/supabase/queries.ts#L150-L230)
- Компонент: [`components/charts/quality-trends-chart.tsx`](components/charts/quality-trends-chart.tsx)

---

## Category Distribution (Pie Chart)

**Что показывает**: Распределение записей по категориям с процентом качества.

**Тип графика**: Pie chart

**Расчет**:
```sql
SELECT
  request_subtype as category,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE changed = false AND email IN (:qualifiedAgents)) * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE email IN (:qualifiedAgents)), 0) as good_percentage
FROM ai_human_comparison
WHERE created_at BETWEEN :dateFrom AND :dateTo
GROUP BY request_subtype
ORDER BY total_records DESC
```

**Структура данных**:
```typescript
[
  {
    category: "shipping_question",
    totalRecords: 1523,
    goodPercentage: 85.5,
    percentage: 42.3  // процент от общего числа записей
  },
  {
    category: "account_issue",
    totalRecords: 897,
    goodPercentage: 72.1,
    percentage: 24.9
  },
  ...
]
```

**Визуализация**:
- **Размер сектора**: Пропорционален `totalRecords`
- **Цвет**: Из CSS переменных `--chart-1` до `--chart-5`
- **Label**: Название категории + процент от общего
- **Tooltip**: Показывает:
  - Количество записей
  - Процент качества AI
  - Процент от общего числа

**Код**:
- Запрос: [`lib/supabase/queries.ts:getCategoryDistribution()`](lib/supabase/queries.ts#L230-L290)
- Компонент: [`components/charts/category-distribution-chart.tsx`](components/charts/category-distribution-chart.tsx)

---

## Version Comparison (Bar Chart)

**Что показывает**: Сравнение качества разных версий промптов.

**Тип графика**: Bar chart (grouped or stacked)

**Расчет**:
```sql
SELECT
  prompt_version as version,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE changed = false AND email IN (:qualifiedAgents)) * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE email IN (:qualifiedAgents)), 0) as good_percentage,
  COUNT(*) FILTER (WHERE changed = true AND email IN (:qualifiedAgents)) as changed_records,
  COUNT(*) FILTER (WHERE changed = false AND email IN (:qualifiedAgents)) as unchanged_records
FROM ai_human_comparison
WHERE created_at BETWEEN :dateFrom AND :dateTo
GROUP BY prompt_version
ORDER BY prompt_version
```

**Структура данных**:
```typescript
[
  {
    version: "v1",
    totalRecords: 450,
    goodPercentage: 65.5,
    changedRecords: 155,
    unchangedRecords: 295
  },
  {
    version: "v2",
    totalRecords: 823,
    goodPercentage: 78.2,
    changedRecords: 179,
    unchangedRecords: 644
  },
  {
    version: "v3",
    totalRecords: 1247,
    goodPercentage: 85.1,
    changedRecords: 186,
    unchangedRecords: 1061
  }
]
```

**Визуализация**:
- **X-axis**: Версии промптов (v1, v2, v3...)
- **Y-axis**: Процент качества (0-100%)
- **Bars**: Каждая версия - отдельный столбец
- **Colors**:
  - Зеленый для "Good" (unchanged)
  - Красный для "Changed"
- **Tooltip**: Показывает детальную статистику

**Код**:
- Запрос: [`lib/supabase/queries.ts:getVersionComparison()`](lib/supabase/queries.ts#L290-L350)
- Компонент: [`components/charts/version-comparison-chart.tsx`](components/charts/version-comparison-chart.tsx)

---

## Detailed Stats Table

**Что показывает**: Детальная таблица с иерархической структурой:
- **Уровень 1**: Агрегация по версии промпта
- **Уровень 2**: Разбивка по неделям внутри версии

**Расчет (UNION запрос)**:

### Уровень 1: Агрегация по версии
```sql
SELECT
  request_subtype as category,
  prompt_version as version,
  NULL as dates,
  1 as sort_order,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE changed = true AND email IN (:qualifiedAgents)) as changed_count,
  COUNT(*) FILTER (WHERE changed = false AND email IN (:qualifiedAgents)) as unchanged_count,
  COUNT(*) FILTER (WHERE changed = false AND email IN (:qualifiedAgents)) * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE email IN (:qualifiedAgents)), 0) as good_percentage
FROM ai_human_comparison
WHERE created_at BETWEEN :dateFrom AND :dateTo
GROUP BY request_subtype, prompt_version
```

### Уровень 2: Разбивка по неделям
```sql
SELECT
  request_subtype as category,
  prompt_version as version,
  TO_CHAR(DATE_TRUNC('week', created_at), 'DD.MM.YYYY') || ' — ' ||
    TO_CHAR(DATE_TRUNC('week', created_at) + INTERVAL '6 days', 'DD.MM.YYYY') as dates,
  2 as sort_order,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE changed = true AND email IN (:qualifiedAgents)) as changed_count,
  COUNT(*) FILTER (WHERE changed = false AND email IN (:qualifiedAgents)) as unchanged_count,
  COUNT(*) FILTER (WHERE changed = false AND email IN (:qualifiedAgents)) * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE email IN (:qualifiedAgents)), 0) as good_percentage
FROM ai_human_comparison
WHERE created_at BETWEEN :dateFrom AND :dateTo
GROUP BY request_subtype, prompt_version, DATE_TRUNC('week', created_at)

ORDER BY category, version, sort_order, dates
```

**Структура данных**:
```typescript
[
  // Уровень 1: Версия (агрегация)
  {
    category: "shipping_question",
    version: "v3",
    dates: null,
    totalRecords: 450,
    changedCount: 67,
    unchangedCount: 383,
    goodPercentage: 85.1,
    isParent: true
  },
  // Уровень 2: Недели внутри версии
  {
    category: "shipping_question",
    version: "v3",
    dates: "01.01.2024 — 07.01.2024",
    totalRecords: 89,
    changedCount: 12,
    unchangedCount: 77,
    goodPercentage: 86.5,
    isParent: false
  },
  {
    category: "shipping_question",
    version: "v3",
    dates: "08.01.2024 — 14.01.2024",
    totalRecords: 95,
    changedCount: 15,
    unchangedCount: 80,
    goodPercentage: 84.2,
    isParent: false
  },
  ...
]
```

**Визуализация**:
- **Columns**: Category, Version, Dates, Total Records, Good, Changed, Quality %
- **Expandable rows**: Родительские строки (версии) раскрываются, показывая недельные данные
- **Sorting**: По любой колонке
- **Color coding**: Quality % окрашивается:
  - 🟢 Зеленый: 61-100%
  - 🟡 Желтый: 31-60%
  - 🔴 Красный: 0-30%
- **CSV Export**: Экспорт всех данных

**Код**:
- Запрос: [`lib/supabase/queries.ts:getDetailedStats()`](lib/supabase/queries.ts#L350-L500)
- Компонент: [`components/tables/detailed-stats-table.tsx`](components/tables/detailed-stats-table.tsx)

---

## Тренды и сравнения периодов

### Расчет предыдущего периода

Для всех KPI рассчитывается тренд - сравнение с **предыдущим периодом равной длительности**.

**Алгоритм**:
```typescript
// Текущий период
const currentFrom = filters.dateRange.from  // например, 2024-01-01
const currentTo = filters.dateRange.to      // например, 2024-01-31

// Длительность периода
const daysDiff = (currentTo - currentFrom) / (1000 * 60 * 60 * 24)  // 30 дней

// Предыдущий период
const previousFrom = new Date(currentFrom)
previousFrom.setDate(previousFrom.getDate() - daysDiff)  // 2023-12-02
const previousTo = currentFrom                            // 2024-01-01
```

**Пример**:
- Текущий период: **01.01.2024 - 31.01.2024** (31 день)
- Предыдущий период: **01.12.2023 - 31.12.2023** (31 день)

### Расчет тренда

**Формула**:
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

**Примеры**:

1. **Total Records**:
   - Current: 1500 записей
   - Previous: 1200 записей
   - Trend: `+300` (+25% ↑)

2. **Average Quality**:
   - Current: 85.5%
   - Previous: 78.2%
   - Trend: `+7.3%` (+9.3% ↑)

3. **Records Changed**:
   - Current: 180 записей
   - Previous: 220 записей
   - Trend: `-40` (-18.2% ↓) ← **Хорошо!** Меньше правок = лучше AI

### Визуализация трендов

**В KPI картах**:
- ↑ Зеленая стрелка вверх + процент (рост - хорошо для качества)
- ↓ Красная стрелка вниз + процент (падение - плохо для качества)
- → Серая стрелка (без изменений)

**Код**: [`lib/utils/calculations.ts:calculateTrend()`](lib/utils/calculations.ts)

---

## Производительность

### Параллельное выполнение

Все запросы выполняются **параллельно** через `Promise.all()`:

```typescript
const [kpi, qualityTrends, categoryDistribution, versionComparison, detailedStats] =
  await Promise.all([
    getKPIData(filters),
    getQualityTrends(filters),
    getCategoryDistribution(filters),
    getVersionComparison(filters),
    getDetailedStats(filters)
  ])
```

### Оптимизации

1. **SELECT только нужных полей** (не `SELECT *`)
2. **Индексы на всех фильтруемых колонках**:
   - `created_at`
   - `prompt_version`
   - `request_subtype`
   - `email`
   - `changed`
3. **Composite indexes** для частых комбинаций:
   - `(created_at DESC, email, changed)`
   - `(prompt_version, changed)`
   - `(request_subtype, changed, created_at)`
4. **Timeout protection** (30 секунд)
5. **Retry logic** (2 попытки с 1 сек задержкой)
6. **Кэширование** (React Query):
   - `staleTime: 2 минуты`
   - `gcTime: 10 минут`

### Мониторинг производительности

В консоли выводятся логи с временем выполнения каждого запроса:

```
🚀 [Dashboard] Starting data fetch...
✅ [Dashboard] KPIs took 1199ms
✅ [Dashboard] QualityTrends took 2894ms
✅ [Dashboard] CategoryDist took 3742ms
✅ [Dashboard] VersionComp took 3574ms
✅ [Dashboard] DetailedStats took 15406ms
🏁 [Dashboard] Total fetch time: 15407ms
```

**Целевые показатели**:
- KPIs: < 2 сек
- Charts: < 5 сек
- DetailedStats: < 20 сек
- Total: < 25 сек

---

## Файлы кода

### Queries (SQL)
- [`lib/supabase/queries.ts`](lib/supabase/queries.ts) - Все SQL запросы

### Server Actions
- [`lib/actions/dashboard-actions.ts`](lib/actions/dashboard-actions.ts) - Server Actions для fetch данных

### React Query Hooks
- [`lib/queries/dashboard-queries.ts`](lib/queries/dashboard-queries.ts) - React Query хуки с кэшированием

### Components
- [`components/kpi/`](components/kpi/) - KPI карточки
- [`components/charts/`](components/charts/) - Графики
- [`components/tables/`](components/tables/) - Таблицы
- [`components/dashboard-content.tsx`](components/dashboard-content.tsx) - Главный компонент дашборда

### Utils
- [`lib/utils/calculations.ts`](lib/utils/calculations.ts) - Расчет трендов и метрик

### Constants
- [`constants/qualified-agents.ts`](constants/qualified-agents.ts) - Список квалифицированных агентов

---

## Примеры использования данных

### Пример 1: Анализ качества AI по категориям

**Цель**: Понять, в каких категориях AI работает лучше всего.

**Где смотреть**:
1. **Category Distribution (Pie Chart)** - видно распределение и качество по категориям
2. **Best Category KPI** - показывает лучшую категорию
3. **Quality Trends Chart** - видна динамика по каждой категории

**Пример инсайта**:
```
Category "shipping_question": 85.5% качества (1523 записей)
→ AI хорошо справляется с вопросами о доставке

Category "account_issue": 62.3% качества (897 записей)
→ AI нуждается в улучшении для вопросов об аккаунтах
```

---

### Пример 2: Сравнение версий промптов

**Цель**: Определить, улучшилось ли качество после обновления промпта.

**Где смотреть**:
1. **Version Comparison (Bar Chart)** - сравнение всех версий
2. **Detailed Stats Table** - детальная разбивка по версиям и неделям

**Пример инсайта**:
```
v1: 65.5% качества (450 записей)
v2: 78.2% качества (823 записей) → +12.7% улучшение
v3: 85.1% качества (1247 записей) → +6.9% улучшение

Вывод: Каждая новая версия улучшает качество AI
```

---

### Пример 3: Мониторинг динамики качества

**Цель**: Отследить, улучшается или ухудшается качество AI со временем.

**Где смотреть**:
1. **Quality Trends Chart** - динамика по неделям
2. **Average Quality KPI** - тренд по сравнению с предыдущим периодом

**Пример инсайта**:
```
Неделя 1: 78.5%
Неделя 2: 81.2% → +2.7%
Неделя 3: 79.8% → -1.4%
Неделя 4: 85.1% → +5.3%

Average Quality: 85.5% (↑ +9.3% vs previous period)

Вывод: Общий тренд положительный, качество растет
```

---

## FAQ

### Почему используется `changed = false` для хорошего качества?

**Логика**: Если квалифицированный агент **не изменил** AI-ответ (`changed = false`), значит AI сгенерировал качественный ответ, который не требует правки.

### Почему считается средний процент по категориям, а не общий процент?

**Причина**: Чтобы избежать смещения (bias) в сторону категорий с большим количеством записей.

**Пример проблемы**:
```
Category A: 1000 записей, 50% качества → 500 хороших
Category B: 100 записей, 90% качества → 90 хороших

Общий процент: 590/1100 = 53.6%
Средний процент: (50 + 90) / 2 = 70%

Средний процент точнее отражает качество AI в целом
```

### Почему тренд сравнивает с периодом равной длительности?

**Причина**: Честное сравнение. Нельзя сравнивать 30 дней с 7 днями - это даст искаженные результаты.

### Что если агент не квалифицированный?

**Ответ**: Его записи **не учитываются** в расчете качества. Они видны в таблице, но не влияют на KPI и графики.

---

## Заключение

Все расчеты на дашборде следуют единому принципу:
- ✅ **Прозрачность**: Понятная логика расчетов
- ✅ **Справедливость**: Учет только квалифицированных агентов
- ✅ **Сравнимость**: Корректные тренды с равными периодами
- ✅ **Производительность**: Оптимизированные SQL запросы с индексами
- ✅ **Надежность**: Timeout protection и retry logic

Для дополнительных вопросов см. [PRD.md](PRD.md) и [PERFORMANCE.md](PERFORMANCE.md).
