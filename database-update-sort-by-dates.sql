-- Update get_detailed_stats_paginated function to sort by dates DESC within each category
-- This ensures that within each category, the newest week appears first after the version-level row

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_detailed_stats_paginated(
  p_from_date timestamptz,
  p_to_date timestamptz,
  p_versions text[],
  p_categories text[],
  p_agents text[],
  p_page integer,
  p_page_size integer
);

-- Recreate the function with updated ORDER BY clause
CREATE OR REPLACE FUNCTION get_detailed_stats_paginated(
  p_from_date timestamptz,
  p_to_date timestamptz,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE(
  category text,
  version text,
  dates text,
  sort_order integer,
  total_records bigint,
  records_qualified_agents bigint,
  changed_records bigint,
  good_percentage numeric,
  total_count bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_offset integer;
  v_total_count bigint;
BEGIN
  -- Calculate offset for pagination
  v_offset := p_page * p_page_size;

  -- Get total count first (for pagination metadata)
  -- This is a CTE that will be referenced in the main query
  WITH filtered_data AS (
    SELECT
      request_subtype,
      prompt_version,
      date_trunc('week', created_at) as week_start,
      COUNT(*) as total_records,
      SUM(CASE WHEN changed = false THEN 1 ELSE 0 END) as unchanged_records,
      SUM(CASE WHEN changed = true THEN 1 ELSE 0 END) as changed_records
    FROM ai_human_comparison
    WHERE created_at >= p_from_date
      AND created_at <= p_to_date
      AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
      AND (p_categories IS NULL OR request_subtype = ANY(p_categories))
      AND (p_agents IS NULL OR email = ANY(p_agents))
    GROUP BY request_subtype, prompt_version, week_start
  ),

  -- Version-level aggregates (sort_order = 1)
  version_aggregates AS (
    SELECT
      request_subtype as category,
      prompt_version as version,
      NULL::text as dates,
      1 as sort_order,
      SUM(total_records) as total_records,
      SUM(total_records) as records_qualified_agents,
      SUM(changed_records) as changed_records,
      CASE
        WHEN SUM(total_records) > 0
        THEN ROUND((SUM(unchanged_records)::numeric / SUM(total_records)::numeric) * 100, 2)
        ELSE 0
      END as good_percentage,
      NULL::date as week_start_for_sort -- NULL for version-level rows
    FROM filtered_data
    GROUP BY request_subtype, prompt_version
  ),

  -- Week-level rows (sort_order = 2)
  week_aggregates AS (
    SELECT
      request_subtype as category,
      prompt_version as version,
      TO_CHAR(week_start, 'YYYY-MM-DD') || ' - ' || TO_CHAR(week_start + interval '6 days', 'YYYY-MM-DD') as dates,
      2 as sort_order,
      total_records,
      total_records as records_qualified_agents,
      changed_records,
      CASE
        WHEN total_records > 0
        THEN ROUND((unchanged_records::numeric / total_records::numeric) * 100, 2)
        ELSE 0
      END as good_percentage,
      week_start::date as week_start_for_sort -- Keep the date for sorting
    FROM filtered_data
  ),

  -- Union all rows together
  all_rows AS (
    SELECT * FROM version_aggregates
    UNION ALL
    SELECT * FROM week_aggregates
  ),

  -- Count total rows for pagination
  count_cte AS (
    SELECT COUNT(*) as cnt FROM all_rows
  )

  -- Main query with proper sorting and pagination
  SELECT
    ar.category,
    ar.version,
    ar.dates,
    ar.sort_order,
    ar.total_records,
    ar.records_qualified_agents,
    ar.changed_records,
    ar.good_percentage,
    cc.cnt as total_count
  INTO
    category,
    version,
    dates,
    sort_order,
    total_records,
    records_qualified_agents,
    changed_records,
    good_percentage,
    total_count
  FROM all_rows ar
  CROSS JOIN count_cte cc
  -- IMPORTANT: Order by category, then sort_order (version first), then dates DESC (newest first)
  -- week_start_for_sort is NULL for version-level rows, so they come first (NULLS FIRST)
  ORDER BY
    ar.category ASC,                    -- Group by category
    ar.sort_order ASC,                  -- Version-level (1) before week-level (2)
    ar.week_start_for_sort DESC NULLS FIRST  -- Newest weeks first, version-level (NULL) at top
  LIMIT p_page_size
  OFFSET v_offset;

  RETURN NEXT;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_detailed_stats_paginated IS
'Returns paginated detailed statistics with hierarchical structure.
Sorts by: category ASC → sort_order ASC → week dates DESC (newest first).
Version-level rows (sort_order=1, dates=NULL) appear first within each category,
followed by week-level rows sorted from newest to oldest.';
