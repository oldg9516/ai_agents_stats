-- SQL function for KPI aggregation
-- This avoids the 1000 row limit by aggregating on the database side

DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[], text[]);

CREATE OR REPLACE FUNCTION get_kpi_stats(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL
)
RETURNS TABLE (
  total_records bigint,
  reviewed_records bigint,
  context_shift_records bigint,
  unchanged_records bigint,
  changed_records bigint,
  compared_records bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_records,
    -- Reviewed = has classification
    COUNT(*) FILTER (WHERE change_classification IS NOT NULL)::bigint AS reviewed_records,
    -- Context shift (to exclude from quality)
    COUNT(*) FILTER (WHERE change_classification IN ('context_shift', 'EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'))::bigint AS context_shift_records,
    -- Unchanged = good quality (legacy + new)
    COUNT(*) FILTER (WHERE change_classification IN ('no_significant_change', 'stylistic_preference', 'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH'))::bigint AS unchanged_records,
    -- Changed = had errors (legacy + new)
    COUNT(*) FILTER (WHERE change_classification IN ('critical_error', 'meaningful_improvement', 'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT'))::bigint AS changed_records,
    -- Compared records (status = 'compared', has classification, not context_shift)
    COUNT(*) FILTER (WHERE status = 'compared' AND change_classification IS NOT NULL AND change_classification NOT IN ('context_shift', 'EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'))::bigint AS compared_records
  FROM ai_human_comparison
  WHERE created_at >= p_from_date
    AND created_at <= p_to_date
    AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    AND (p_categories IS NULL OR request_subtype = ANY(p_categories));
END;
$$;

COMMENT ON FUNCTION get_kpi_stats IS 'Returns aggregated KPI statistics for dashboard cards';
