-- ROLLBACK SCRIPT: Restore RPC functions to previous versions (without p_excluded_thread_ids)
-- Run this script if you need to revert the add-excluded-thread-ids-filter.sql migration
--
-- IMPORTANT: Run this BEFORE deploying any code that depends on the new parameter

-- ============================================================================
-- 1. ROLLBACK get_kpi_stats FUNCTION
-- ============================================================================

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
      COUNT(*) FILTER (WHERE change_classification IS NOT NULL)::bigint AS reviewed_records,
      COUNT(*) FILTER (WHERE change_classification = ''context_shift'')::bigint AS context_shift_records,
      COUNT(*) FILTER (
        WHERE change_classification IN (
          ''PERFECT_MATCH'',
          ''STRUCTURAL_FIX'',
          ''STYLISTIC_EDIT'',
          ''no_significant_change'',
          ''stylistic_preference''
        )
      )::bigint AS quality_records,
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

-- ============================================================================
-- 2. ROLLBACK get_best_category FUNCTION
-- ============================================================================

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
  p_date_field text DEFAULT 'created_at'
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
        COUNT(*) FILTER (
          WHERE change_classification IS NOT NULL
            AND change_classification NOT IN (''context_shift'', ''EXCL_WORKFLOW_SHIFT'', ''EXCL_DATA_DISCREPANCY'')
        ) AS total_evaluable,
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
  USING p_from_date, p_to_date, p_versions, p_categories, p_agents;
END;
$$;

COMMENT ON FUNCTION get_best_category IS 'Returns the best performing category by quality percentage.';

-- ============================================================================
-- 3. ROLLBACK get_category_distribution FUNCTION
-- ============================================================================

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
  p_date_field text DEFAULT 'created_at'
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
      COUNT(*) FILTER (WHERE changed = false)::bigint AS unchanged_records
    FROM ai_human_comparison
    WHERE %I >= $1
      AND %I <= $2
      AND ($3 IS NULL OR prompt_version = ANY($3))
      AND ($4 IS NULL OR request_subtype = ANY($4))
      AND ($5 IS NULL OR email = ANY($5))
      AND (email IS NULL OR email != ''api@levhaolam.com'')
      %s
    GROUP BY request_subtype
    ORDER BY total_records DESC
  ',
    p_date_field,
    p_date_field,
    CASE WHEN p_date_field = 'human_reply_date' THEN 'AND human_reply_date IS NOT NULL' ELSE '' END
  )
  USING p_from_date, p_to_date, p_versions, p_categories, p_agents;
END;
$$;

COMMENT ON FUNCTION get_category_distribution IS 'Returns category distribution with total and unchanged record counts.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this rollback, verify functions work:
-- SELECT * FROM get_kpi_stats(NOW() - INTERVAL '7 days', NOW());
-- SELECT * FROM get_best_category(NOW() - INTERVAL '7 days', NOW());
-- SELECT * FROM get_category_distribution(NOW() - INTERVAL '7 days', NOW());
