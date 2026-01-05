-- Step 1: Drop the old function (both signatures)
DROP FUNCTION IF EXISTS get_detailed_stats_paginated(timestamp with time zone,timestamp with time zone,text[],text[],integer,integer);
DROP FUNCTION IF EXISTS get_detailed_stats_paginated(timestamp with time zone,timestamp with time zone,text[],text[],text[],integer,integer);

-- Step 2: Create the new function with new classification columns and agent filter
-- NOTE: This function returns ALL rows without pagination (LIMIT/OFFSET removed)
-- Pagination is handled client-side to ensure all categories are visible
CREATE OR REPLACE FUNCTION get_detailed_stats_paginated(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL,
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
  out_total_count bigint,
  -- New classification columns (v4.0)
  out_critical_fact_errors bigint,
  out_major_functional_omissions bigint,
  out_minor_info_gaps bigint,
  out_confusing_verbosity bigint,
  out_tonal_misalignments bigint,
  out_structural_fixes bigint,
  out_stylistic_edits bigint,
  out_perfect_matches bigint,
  out_excl_workflow_shifts bigint,
  out_excl_data_discrepancies bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_count bigint;
BEGIN
  -- Return ALL results (no pagination - handled client-side)
  -- This ensures all categories are returned
  RETURN QUERY
  WITH filtered_data AS (
    SELECT request_subtype, prompt_version, created_at, email, changed, change_classification
    FROM ai_human_comparison
    WHERE created_at >= p_from_date AND created_at <= p_to_date
      AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
      AND (p_categories IS NULL OR request_subtype = ANY(p_categories))
      AND (p_agents IS NULL OR email = ANY(p_agents))
      AND (email IS NULL OR email != 'api@levhaolam.com')  -- Exclude system/API emails
  ),
  version_aggregations AS (
    SELECT
      request_subtype AS category,
      prompt_version AS version,
      NULL::text AS dates,
      NULL::timestamp with time zone AS week_start_date,
      1 AS sort_order,
      COUNT(*)::bigint AS total_records,
      -- Reviewed: legacy + new classifications
      COUNT(*) FILTER (WHERE change_classification IN (
        'critical_error', 'meaningful_improvement', 'stylistic_preference', 'no_significant_change', 'context_shift',
        'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT',
        'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH', 'EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'
      ))::bigint AS reviewed_records,
      -- AI Errors: legacy + new
      COUNT(*) FILTER (WHERE change_classification IN (
        'critical_error', 'meaningful_improvement',
        'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT'
      ))::bigint AS ai_errors,
      -- AI Quality: legacy + new
      COUNT(*) FILTER (WHERE change_classification IN (
        'no_significant_change', 'stylistic_preference',
        'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH'
      ))::bigint AS ai_quality,
      -- Legacy classifications (v3.x)
      COUNT(*) FILTER (WHERE change_classification = 'critical_error')::bigint AS critical_errors,
      COUNT(*) FILTER (WHERE change_classification = 'meaningful_improvement')::bigint AS meaningful_improvements,
      COUNT(*) FILTER (WHERE change_classification = 'stylistic_preference')::bigint AS stylistic_preferences,
      COUNT(*) FILTER (WHERE change_classification = 'no_significant_change')::bigint AS no_significant_changes,
      COUNT(*) FILTER (WHERE change_classification = 'context_shift')::bigint AS context_shifts,
      -- New classifications (v4.0)
      COUNT(*) FILTER (WHERE change_classification = 'CRITICAL_FACT_ERROR')::bigint AS critical_fact_errors,
      COUNT(*) FILTER (WHERE change_classification = 'MAJOR_FUNCTIONAL_OMISSION')::bigint AS major_functional_omissions,
      COUNT(*) FILTER (WHERE change_classification = 'MINOR_INFO_GAP')::bigint AS minor_info_gaps,
      COUNT(*) FILTER (WHERE change_classification = 'CONFUSING_VERBOSITY')::bigint AS confusing_verbosity,
      COUNT(*) FILTER (WHERE change_classification = 'TONAL_MISALIGNMENT')::bigint AS tonal_misalignments,
      COUNT(*) FILTER (WHERE change_classification = 'STRUCTURAL_FIX')::bigint AS structural_fixes,
      COUNT(*) FILTER (WHERE change_classification = 'STYLISTIC_EDIT')::bigint AS stylistic_edits,
      COUNT(*) FILTER (WHERE change_classification = 'PERFECT_MATCH')::bigint AS perfect_matches,
      COUNT(*) FILTER (WHERE change_classification = 'EXCL_WORKFLOW_SHIFT')::bigint AS excl_workflow_shifts,
      COUNT(*) FILTER (WHERE change_classification = 'EXCL_DATA_DISCREPANCY')::bigint AS excl_data_discrepancies
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
      -- Reviewed: legacy + new classifications
      COUNT(*) FILTER (WHERE change_classification IN (
        'critical_error', 'meaningful_improvement', 'stylistic_preference', 'no_significant_change', 'context_shift',
        'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT',
        'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH', 'EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'
      ))::bigint AS reviewed_records,
      -- AI Errors: legacy + new
      COUNT(*) FILTER (WHERE change_classification IN (
        'critical_error', 'meaningful_improvement',
        'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT'
      ))::bigint AS ai_errors,
      -- AI Quality: legacy + new
      COUNT(*) FILTER (WHERE change_classification IN (
        'no_significant_change', 'stylistic_preference',
        'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH'
      ))::bigint AS ai_quality,
      -- Legacy classifications (v3.x)
      COUNT(*) FILTER (WHERE change_classification = 'critical_error')::bigint AS critical_errors,
      COUNT(*) FILTER (WHERE change_classification = 'meaningful_improvement')::bigint AS meaningful_improvements,
      COUNT(*) FILTER (WHERE change_classification = 'stylistic_preference')::bigint AS stylistic_preferences,
      COUNT(*) FILTER (WHERE change_classification = 'no_significant_change')::bigint AS no_significant_changes,
      COUNT(*) FILTER (WHERE change_classification = 'context_shift')::bigint AS context_shifts,
      -- New classifications (v4.0)
      COUNT(*) FILTER (WHERE change_classification = 'CRITICAL_FACT_ERROR')::bigint AS critical_fact_errors,
      COUNT(*) FILTER (WHERE change_classification = 'MAJOR_FUNCTIONAL_OMISSION')::bigint AS major_functional_omissions,
      COUNT(*) FILTER (WHERE change_classification = 'MINOR_INFO_GAP')::bigint AS minor_info_gaps,
      COUNT(*) FILTER (WHERE change_classification = 'CONFUSING_VERBOSITY')::bigint AS confusing_verbosity,
      COUNT(*) FILTER (WHERE change_classification = 'TONAL_MISALIGNMENT')::bigint AS tonal_misalignments,
      COUNT(*) FILTER (WHERE change_classification = 'STRUCTURAL_FIX')::bigint AS structural_fixes,
      COUNT(*) FILTER (WHERE change_classification = 'STYLISTIC_EDIT')::bigint AS stylistic_edits,
      COUNT(*) FILTER (WHERE change_classification = 'PERFECT_MATCH')::bigint AS perfect_matches,
      COUNT(*) FILTER (WHERE change_classification = 'EXCL_WORKFLOW_SHIFT')::bigint AS excl_workflow_shifts,
      COUNT(*) FILTER (WHERE change_classification = 'EXCL_DATA_DISCREPANCY')::bigint AS excl_data_discrepancies
    FROM filtered_data
    GROUP BY request_subtype, prompt_version, DATE_TRUNC('week', created_at)
  ),
  combined AS (
    SELECT * FROM version_aggregations
    UNION ALL
    SELECT * FROM week_aggregations
  ),
  total AS (
    SELECT COUNT(*)::bigint AS cnt FROM combined
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
    t.cnt AS out_total_count,
    -- New classification outputs
    c.critical_fact_errors AS out_critical_fact_errors,
    c.major_functional_omissions AS out_major_functional_omissions,
    c.minor_info_gaps AS out_minor_info_gaps,
    c.confusing_verbosity AS out_confusing_verbosity,
    c.tonal_misalignments AS out_tonal_misalignments,
    c.structural_fixes AS out_structural_fixes,
    c.stylistic_edits AS out_stylistic_edits,
    c.perfect_matches AS out_perfect_matches,
    c.excl_workflow_shifts AS out_excl_workflow_shifts,
    c.excl_data_discrepancies AS out_excl_data_discrepancies
  FROM combined c
  CROSS JOIN total t
  ORDER BY
    c.category,
    CAST(SUBSTRING(c.version FROM '[0-9]+') AS INTEGER) DESC,
    c.sort_order,
    c.week_start_date DESC NULLS FIRST;
END;
$$;
