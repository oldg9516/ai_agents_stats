-- Update get_detailed_stats_paginated function to include change_classification fields
-- This function needs to be executed in Supabase SQL Editor

-- Step 1: Drop ALL possible old function signatures
DROP FUNCTION IF EXISTS get_detailed_stats_paginated(timestamp with time zone, timestamp with time zone, text[], text[], text[], integer, integer);
DROP FUNCTION IF EXISTS get_detailed_stats_paginated(timestamp with time zone, timestamp with time zone, text[], text[], integer, integer);

-- Step 2: Create new function with context_shift support
CREATE OR REPLACE FUNCTION get_detailed_stats_paginated(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  out_category text,
  out_version text,
  out_dates text,
  out_sort_order integer,
  out_total_records bigint,
  out_reviewed_records bigint,
  out_ai_errors bigint,
  out_ai_quality bigint,
  out_critical_errors bigint,
  out_meaningful_improvements bigint,
  out_stylistic_preferences bigint,
  out_no_significant_changes bigint,
  out_context_shifts bigint,
  out_total_count bigint
) AS $$
DECLARE
  v_offset integer;
  v_total_count bigint;
BEGIN
  v_offset := p_page * p_page_size;

  -- Get total count first (for pagination info)
  SELECT COUNT(*) INTO v_total_count
  FROM (
    -- Version-level aggregations
    SELECT DISTINCT
      request_subtype,
      prompt_version
    FROM ai_human_comparison
    WHERE
      created_at >= p_from_date
      AND created_at <= p_to_date
      AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
      AND (p_categories IS NULL OR request_subtype = ANY(p_categories))
  ) AS unique_versions;

  -- Return paginated results with classification counts
  RETURN QUERY
  WITH filtered_data AS (
    SELECT
      request_subtype,
      prompt_version,
      created_at,
      email,
      changed,
      change_classification
    FROM ai_human_comparison
    WHERE
      created_at >= p_from_date
      AND created_at <= p_to_date
      AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
      AND (p_categories IS NULL OR request_subtype = ANY(p_categories))
  ),
  version_aggregations AS (
    SELECT
      request_subtype AS category,
      prompt_version AS version,
      NULL::text AS dates,
      NULL::timestamp with time zone AS week_start_date,
      1 AS sort_order,
      COUNT(*)::bigint AS total_records,
      COUNT(*) FILTER (WHERE change_classification IS NOT NULL)::bigint AS reviewed_records,
      COUNT(*) FILTER (WHERE change_classification IN ('critical_error', 'meaningful_improvement'))::bigint AS ai_errors,
      COUNT(*) FILTER (WHERE change_classification IN ('no_significant_change', 'stylistic_preference'))::bigint AS ai_quality,
      COUNT(*) FILTER (WHERE change_classification = 'critical_error')::bigint AS critical_errors,
      COUNT(*) FILTER (WHERE change_classification = 'meaningful_improvement')::bigint AS meaningful_improvements,
      COUNT(*) FILTER (WHERE change_classification = 'stylistic_preference')::bigint AS stylistic_preferences,
      COUNT(*) FILTER (WHERE change_classification = 'no_significant_change')::bigint AS no_significant_changes,
      COUNT(*) FILTER (WHERE change_classification = 'context_shift')::bigint AS context_shifts,
      v_total_count AS total_count
    FROM filtered_data
    GROUP BY request_subtype, prompt_version
  ),
  week_aggregations AS (
    SELECT
      request_subtype AS category,
      prompt_version AS version,
      TO_CHAR(DATE_TRUNC('week', created_at), 'DD.MM.YYYY') || ' — ' ||
      TO_CHAR(DATE_TRUNC('week', created_at) + INTERVAL '6 days', 'DD.MM.YYYY') AS dates,
      DATE_TRUNC('week', created_at) AS week_start_date,
      2 AS sort_order,
      COUNT(*)::bigint AS total_records,
      COUNT(*) FILTER (WHERE change_classification IS NOT NULL)::bigint AS reviewed_records,
      COUNT(*) FILTER (WHERE change_classification IN ('critical_error', 'meaningful_improvement'))::bigint AS ai_errors,
      COUNT(*) FILTER (WHERE change_classification IN ('no_significant_change', 'stylistic_preference'))::bigint AS ai_quality,
      COUNT(*) FILTER (WHERE change_classification = 'critical_error')::bigint AS critical_errors,
      COUNT(*) FILTER (WHERE change_classification = 'meaningful_improvement')::bigint AS meaningful_improvements,
      COUNT(*) FILTER (WHERE change_classification = 'stylistic_preference')::bigint AS stylistic_preferences,
      COUNT(*) FILTER (WHERE change_classification = 'no_significant_change')::bigint AS no_significant_changes,
      COUNT(*) FILTER (WHERE change_classification = 'context_shift')::bigint AS context_shifts,
      v_total_count AS total_count
    FROM filtered_data
    GROUP BY request_subtype, prompt_version, DATE_TRUNC('week', created_at)
  ),
  combined AS (
    SELECT
      category,
      version,
      dates,
      week_start_date,
      sort_order,
      total_records,
      reviewed_records,
      ai_errors,
      ai_quality,
      critical_errors,
      meaningful_improvements,
      stylistic_preferences,
      no_significant_changes,
      context_shifts,
      total_count
    FROM version_aggregations
    UNION ALL
    SELECT
      category,
      version,
      dates,
      week_start_date,
      sort_order,
      total_records,
      reviewed_records,
      ai_errors,
      ai_quality,
      critical_errors,
      meaningful_improvements,
      stylistic_preferences,
      no_significant_changes,
      context_shifts,
      total_count
    FROM week_aggregations
  )
  SELECT
    c.category AS out_category,
    c.version AS out_version,
    c.dates AS out_dates,
    c.sort_order AS out_sort_order,
    c.total_records AS out_total_records,
    c.reviewed_records AS out_reviewed_records,
    c.ai_errors AS out_ai_errors,
    c.ai_quality AS out_ai_quality,
    c.critical_errors AS out_critical_errors,
    c.meaningful_improvements AS out_meaningful_improvements,
    c.stylistic_preferences AS out_stylistic_preferences,
    c.no_significant_changes AS out_no_significant_changes,
    c.context_shifts AS out_context_shifts,
    c.total_count AS out_total_count
  FROM combined c
  ORDER BY
    c.category,
    CAST(SUBSTRING(c.version FROM '[0-9]+') AS INTEGER) DESC,
    c.sort_order,
    c.week_start_date DESC NULLS FIRST
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;
