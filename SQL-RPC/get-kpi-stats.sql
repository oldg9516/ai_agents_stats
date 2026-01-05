-- SQL function for KPI statistics aggregation
-- This avoids the 1000 row limit by aggregating on the database side
-- Excludes system/API emails (api@levhaolam.com) from statistics
--
-- Returns:
-- - total_records: Count of all records
-- - reviewed_records: Count of records with change_classification IS NOT NULL
-- - context_shift_records: Count of context_shift records
-- - quality_records: Count of good quality records (PERFECT_MATCH, STRUCTURAL_FIX, STYLISTIC_EDIT, no_significant_change, stylistic_preference)
-- - changed_records: Count of reviewed records excluding context_shift (for Records Changed KPI)

-- Drop all possible overloads of the function
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[]);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[], text[]);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[], text[], text[], text);

CREATE OR REPLACE FUNCTION get_kpi_stats(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL,
  p_date_field text DEFAULT 'created_at'
)
RETURNS TABLE (
  total_records bigint,
  reviewed_records bigint,
  context_shift_records bigint,
  quality_records bigint,
  changed_records bigint
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate p_date_field to prevent SQL injection
  IF p_date_field NOT IN ('created_at', 'human_reply_date') THEN
    p_date_field := 'created_at';
  END IF;

  RETURN QUERY EXECUTE format('
    SELECT
      COUNT(*)::bigint AS total_records,
      -- reviewed_records: change_classification IS NOT NULL
      COUNT(*) FILTER (WHERE change_classification IS NOT NULL)::bigint AS reviewed_records,
      -- context_shift_records: change_classification = ''context_shift''
      COUNT(*) FILTER (WHERE change_classification = ''context_shift'')::bigint AS context_shift_records,
      -- quality_records: good quality classifications
      COUNT(*) FILTER (
        WHERE change_classification IN (
          ''PERFECT_MATCH'',
          ''STRUCTURAL_FIX'',
          ''STYLISTIC_EDIT'',
          ''no_significant_change'',
          ''stylistic_preference''
        )
      )::bigint AS quality_records,
      -- changed_records: reviewed records with status = ''compared'', excluding context_shift
      COUNT(*) FILTER (
        WHERE status = ''compared''
          AND change_classification IS NOT NULL
          AND change_classification != ''context_shift''
      )::bigint AS changed_records
    FROM ai_human_comparison
    WHERE %I >= $1
      AND %I <= $2
      AND ($3 IS NULL OR prompt_version = ANY($3))
      AND ($4 IS NULL OR request_subtype = ANY($4))
      AND ($5 IS NULL OR email = ANY($5))
      AND (email IS NULL OR email != ''api@levhaolam.com'')
      %s
  ',
    p_date_field,
    p_date_field,
    CASE WHEN p_date_field = 'human_reply_date' THEN 'AND human_reply_date IS NOT NULL' ELSE '' END
  )
  USING p_from_date, p_to_date, p_versions, p_categories, p_agents;
END;
$$;

COMMENT ON FUNCTION get_kpi_stats IS 'Returns aggregated KPI statistics: total records, reviewed records, context_shift records, quality records, and changed records. Excludes system/API emails (api@levhaolam.com). Supports dynamic date field (created_at or human_reply_date).';
