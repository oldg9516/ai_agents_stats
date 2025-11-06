# Database Fix: Правильный расчет Total Records и Qualified Agents

## Проблема

В таблице на дашборде **НЕПРАВИЛЬНО** считались метрики:

### Было (НЕПРАВИЛЬНО):
```sql
-- filtered_data фильтровала ВСЕ данные по p_agents
WHERE (p_agents IS NULL OR email = ANY(p_agents))

-- Результат:
total_records = только записи квалифицированных агентов ❌
records_qualified_agents = только записи квалифицированных агентов ❌
```

### Стало (ПРАВИЛЬНО):
```sql
-- Данные НЕ фильтруются по агентам в WHERE
-- Фильтр по агентам применяется только в COUNT(*) FILTER

-- Результат:
total_records = ВСЕ записи (COUNT(*)) ✅
records_qualified_agents = только квалифицированные (COUNT(*) FILTER WHERE email IN (...)) ✅
changed_records = только changed от квалифицированных ✅
good_percentage = (unchanged qualified / total qualified) * 100 ✅
```

## Правильная логика расчета

Из твоего SQL запроса:

```sql
SELECT
    request_subtype as category,
    prompt_version as version,
    TO_CHAR(DATE_TRUNC('week', created_at), 'DD.MM.YYYY') || ' — ' ||
    TO_CHAR(DATE_TRUNC('week', created_at) + INTERVAL '6 days', 'DD.MM.YYYY') as dates,
    2 as sort_order,

    -- ВСЕ записи (без фильтра по агентам)
    COUNT(*) as total_records,

    -- Только записи квалифицированных агентов
    COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com', 'yakov@levhaolam.com')) as records_qualified_agents,

    -- Только changed записи квалифицированных агентов
    COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com', 'yakov@levhaolam.com') AND changed = true) as changed_records,

    -- Процент качества: (unchanged qualified / total qualified) * 100
    CONCAT(
        ROUND(
            (COUNT(*) FILTER (WHERE email IN (...) AND changed = false) * 100.0 /
            NULLIF(COUNT(*) FILTER (WHERE email IN (...)), 0)),
        0
        ), '%'
    ) as good_percentage
FROM public.ai_human_comparison
GROUP BY request_subtype, prompt_version, DATE_TRUNC('week', created_at)
ORDER BY category, sort_order, version, dates;
```

## Что исправлено в SQL функции

### 1. Убран фильтр по агентам из WHERE
**Было:**
```sql
WHERE created_at >= p_from_date
  AND created_at <= p_to_date
  AND (p_agents IS NULL OR email = ANY(p_agents)) -- ❌ Неправильно
```

**Стало:**
```sql
WHERE created_at >= p_from_date
  AND created_at <= p_to_date
  -- Фильтр по агентам убран отсюда ✅
```

### 2. Добавлены COUNT(*) FILTER для разделения метрик
```sql
-- Total records = ALL records (no agent filter)
COUNT(*) as total_records,

-- Qualified agents records = only records from p_agents
COUNT(*) FILTER (WHERE p_agents IS NULL OR email = ANY(p_agents)) as records_qualified_agents,

-- Changed records = only changed records from qualified agents
COUNT(*) FILTER (WHERE (p_agents IS NULL OR email = ANY(p_agents)) AND changed = true) as changed_records,

-- Unchanged records = only unchanged records from qualified agents
COUNT(*) FILTER (WHERE (p_agents IS NULL OR email = ANY(p_agents)) AND changed = false) as unchanged_records
```

### 3. Формат дат изменен на DD.MM.YYYY (как в твоем запросе)
**Было:**
```sql
TO_CHAR(week_start, 'YYYY-MM-DD') || ' - ' || TO_CHAR(week_start + interval '6 days', 'YYYY-MM-DD')
-- Результат: "2025-11-03 - 2025-11-09"
```

**Стало:**
```sql
TO_CHAR(week_start, 'DD.MM.YYYY') || ' — ' || TO_CHAR(week_start + interval '6 days', 'DD.MM.YYYY')
-- Результат: "03.11.2025 — 09.11.2025"
```

### 4. Правильный расчет good_percentage
```sql
CASE
  WHEN records_qualified_agents > 0
  THEN ROUND((unchanged_records::numeric / records_qualified_agents::numeric) * 100, 2)
  ELSE 0
END as good_percentage
```

## Как применить

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбери свой проект
3. Перейди в **SQL Editor** (левая панель)
4. Нажми **New Query**
5. Скопируй весь код из файла `database-fix-records-calculation.sql`
6. Вставь в редактор и нажми **Run** (или Cmd/Ctrl + Enter)
7. Проверь, что функция обновилась без ошибок

### Вариант 2: Через Supabase CLI

```bash
# Убедись, что установлен Supabase CLI
supabase --version

# Выполни SQL напрямую
psql $DATABASE_URL < database-fix-records-calculation.sql
```

## Пример результата

После применения скрипта данные будут выглядеть так:

```json
{
  "category": "customization_request",
  "version": "v1",
  "dates": "03.11.2025 — 09.11.2025",
  "sort_order": 2,
  "total_records": 9,           // ✅ ВСЕ записи (включая неквалифицированных агентов)
  "records_qualified_agents": 0, // ✅ Только квалифицированные
  "changed_records": 0,          // ✅ Только changed от квалифицированных
  "good_percentage": 0           // ✅ (0 unchanged / 0 total qualified) * 100
}
```

```json
{
  "category": "gratitude",
  "version": "v1",
  "dates": "22.09.2025 — 28.09.2025",
  "sort_order": 2,
  "total_records": 294,          // ✅ ВСЕ записи
  "records_qualified_agents": 134, // ✅ Только квалифицированные (например, из 294)
  "changed_records": 24,         // ✅ 24 changed от 134 квалифицированных
  "good_percentage": 82.09       // ✅ (110 unchanged / 134 total qualified) * 100 = 82%
}
```

## Проверка

После применения скрипта:

1. Открой дашборд: `http://localhost:3000/dashboard`
2. Проверь таблицу:
   - **Total Records** = ВСЕ записи (больше или равно Qualified Agents)
   - **Qualified Agents** = только записи квалифицированных агентов
   - **Records Changed** = только changed записи квалифицированных
   - **Good %** = процент unchanged от квалифицированных

### Ожидаемый результат

Для недели "03.11.2025 — 09.11.2025" категории "payment_question":
```
Total Records: 184           (все записи)
Qualified Agents: 0          (ни одной от квалифицированных)
Records Changed: 0           (нет changed от квалифицированных)
Good %: 0%                   (нет данных для расчета)
```

Для недели "22.09.2025 — 28.09.2025" категории "gratitude":
```
Total Records: 294           (все записи)
Qualified Agents: 134        (только квалифицированные)
Records Changed: 24          (24 changed от 134)
Good %: 82%                  (110 unchanged / 134 = 82%)
```

## Откат изменений

Если нужно вернуть старую версию функции, сохрани текущую версию перед применением:

```sql
-- Получить текущую версию функции
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_detailed_stats_paginated';
```

## Связанные файлы

- `database-fix-records-calculation.sql` - SQL скрипт для Supabase
- `database-update-sort-by-dates.sql` - Старый скрипт (сортировка) - ЗАМЕНЕН этим скриптом
- `database-update-sort-by-dates-README.md` - Старый README - ЗАМЕНЕН этим README

## Примечания

- ✅ Формат дат: `DD.MM.YYYY — DD.MM.YYYY` (как в твоем запросе)
- ✅ Сортировка: category ASC → sort_order ASC → dates DESC (новые первыми)
- ✅ Total Records = ВСЕ записи (COUNT(*))
- ✅ Qualified Agents = только квалифицированные (COUNT(*) FILTER WHERE email IN (...))
- ✅ Changed Records = только changed от квалифицированных
- ✅ Good % = (unchanged qualified / total qualified) * 100
