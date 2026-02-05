-- SQL migration to add p_excluded_thread_ids parameter to RPC functions
-- This enables the "Hide Requires Editing" filter on the dashboard
-- which excludes records linked to support_threads_data.requires_editing = true
--
-- Usage: Pass an array of thread_ids to exclude from the statistics
-- When p_excluded_thread_ids is NULL, all records are included

-- ============================================================================
-- 1. UPDATE get_kpi_stats FUNCTION
-- ============================================================================

-- Drop all possible overloads of the function
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[]);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[], text[]);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[], text[], text[], text);
DROP FUNCTION IF EXISTS get_kpi_stats(timestamp with time zone, timestamp with time zone, text[], text[], text[], text, text[]);

CREATE OR REPLACE FUNCTION get_kpi_stats(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL,
  p_date_field text DEFAULT 'created_at',
  p_excluded_thread_ids text[] DEFAULT NULL
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
      AND ($6 IS NULL OR thread_id IS NULL OR thread_id != ALL($6))
      %s
  ',
    p_date_field,
    p_date_field,
    CASE WHEN p_date_field = 'human_reply_date' THEN 'AND human_reply_date IS NOT NULL' ELSE '' END
  )
  USING p_from_date, p_to_date, p_versions, p_categories, p_agents, p_excluded_thread_ids;
END;
$$;

COMMENT ON FUNCTION get_kpi_stats IS 'Returns aggregated KPI statistics. Supports p_excluded_thread_ids to filter out records with specific thread_ids (for hideRequiresEditing filter).';

-- ============================================================================
-- 2. UPDATE get_best_category FUNCTION
-- ============================================================================

-- Drop all possible overloads of the function
DROP FUNCTION IF EXISTS get_best_category(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_best_category(timestamp with time zone, timestamp with time zone, text[]);
DROP FUNCTION IF EXISTS get_best_category(timestamp with time zone, timestamp with time zone, text[], text[]);
DROP FUNCTION IF EXISTS get_best_category(timestamp with time zone, timestamp with time zone, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_best_category(timestamp with time zone, timestamp with time zone, text[], text[], text[], text);
DROP FUNCTION IF EXISTS get_best_category(timestamp with time zone, timestamp with time zone, text[], text[], text[], text, text[]);

CREATE OR REPLACE FUNCTION get_best_category(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL,
  p_date_field text DEFAULT 'created_at',
  p_excluded_thread_ids text[] DEFAULT NULL
)
RETURNS TABLE (
  category text,
  total_evaluable bigint,
  quality_records bigint,
  quality_percentage numeric
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
    WITH category_stats AS (
      SELECT
        request_subtype AS cat,
        -- total_evaluable: reviewed records excluding context_shift and exclusion types
        COUNT(*) FILTER (
          WHERE change_classification IS NOT NULL
            AND change_classification NOT IN (''context_shift'', ''EXCL_WORKFLOW_SHIFT'', ''EXCL_DATA_DISCREPANCY'')
        ) AS total_evaluable,
        -- quality_records: good quality classifications
        COUNT(*) FILTER (
          WHERE change_classification IN (
            ''PERFECT_MATCH'',
            ''STRUCTURAL_FIX'',
            ''STYLISTIC_EDIT'',
            ''no_significant_change'',
            ''stylistic_preference''
          )
        ) AS quality_records
      FROM ai_human_comparison
      WHERE %I >= $1
        AND %I <= $2
        AND ($3 IS NULL OR prompt_version = ANY($3))
        AND ($4 IS NULL OR request_subtype = ANY($4))
        AND ($5 IS NULL OR email = ANY($5))
        AND (email IS NULL OR email != ''api@levhaolam.com'')
        AND ($6 IS NULL OR thread_id IS NULL OR thread_id != ALL($6))
        %s
      GROUP BY request_subtype
      HAVING COUNT(*) FILTER (
        WHERE change_classification IS NOT NULL
          AND change_classification NOT IN (''context_shift'', ''EXCL_WORKFLOW_SHIFT'', ''EXCL_DATA_DISCREPANCY'')
      ) > 0
    )
    SELECT
      cat,
      total_evaluable,
      quality_records,
      ROUND((quality_records::numeric / total_evaluable::numeric) * 100, 2) AS quality_percentage
    FROM category_stats
    ORDER BY quality_percentage DESC, total_evaluable DESC
    LIMIT 1
  ',
    p_date_field,
    p_date_field,
    CASE WHEN p_date_field = 'human_reply_date' THEN 'AND human_reply_date IS NOT NULL' ELSE '' END
  )
  USING p_from_date, p_to_date, p_versions, p_categories, p_agents, p_excluded_thread_ids;
END;
$$;

COMMENT ON FUNCTION get_best_category IS 'Returns the best performing category by quality percentage. Supports p_excluded_thread_ids to filter out records with specific thread_ids.';

-- ============================================================================
-- 3. UPDATE get_category_distribution FUNCTION
-- ============================================================================

-- Drop all possible overloads of the function
DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[]);
DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[], text[]);
DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[], text[], text[], text);
DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[], text[], text[], text, text[]);

CREATE OR REPLACE FUNCTION get_category_distribution(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL,
  p_date_field text DEFAULT 'created_at',
  p_excluded_thread_ids text[] DEFAULT NULL
)
RETURNS TABLE (
  category text,
  total_records bigint,
  unchanged_records bigint
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
      request_subtype AS category,
      COUNT(*)::bigint AS total_records,
      -- unchanged_records: records not changed by human
      COUNT(*) FILTER (WHERE changed = false)::bigint AS unchanged_records
    FROM ai_human_comparison
    WHERE %I >= $1
      AND %I <= $2
      AND ($3 IS NULL OR prompt_version = ANY($3))
      AND ($4 IS NULL OR request_subtype = ANY($4))
      AND ($5 IS NULL OR email = ANY($5))
      AND (email IS NULL OR email != ''api@levhaolam.com'')
      AND ($6 IS NULL OR thread_id IS NULL OR thread_id != ALL($6))
      %s
    GROUP BY request_subtype
    ORDER BY total_records DESC
  ',
    p_date_field,
    p_date_field,
    CASE WHEN p_date_field = 'human_reply_date' THEN 'AND human_reply_date IS NOT NULL' ELSE '' END
  )
  USING p_from_date, p_to_date, p_versions, p_categories, p_agents, p_excluded_thread_ids;
END;
$$;

COMMENT ON FUNCTION get_category_distribution IS 'Returns category distribution with total and unchanged record counts. Supports p_excluded_thread_ids to filter out records with specific thread_ids.';
