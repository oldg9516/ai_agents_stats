-- SQL function for category distribution aggregation
-- This avoids the 1000 row limit by aggregating on the database side
-- Counts ALL records (not just reviewed) for pie chart total display
-- Excludes context_shift from quality calculations only
--
-- Good quality classifications (unchanged_records):
-- - PERFECT_MATCH (new v4.0)
-- - STRUCTURAL_FIX (new v4.0)
-- - STYLISTIC_EDIT (new v4.0)
-- - no_significant_change (legacy v3.x)
-- - stylistic_preference (legacy v3.x)

DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[], text[]);
DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[], text[], text[], text);

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
      -- unchanged_records: good quality classifications only (reviewed, excluding context_shift equivalents)
      COUNT(*) FILTER (
        WHERE change_classification IN (
          ''PERFECT_MATCH'',
          ''STRUCTURAL_FIX'',
          ''STYLISTIC_EDIT'',
          ''no_significant_change'',
          ''stylistic_preference''
        )
      )::bigint AS unchanged_records
    FROM ai_human_comparison
    WHERE %I >= $1
      AND %I <= $2
      AND ($3 IS NULL OR prompt_version = ANY($3))
      AND ($4 IS NULL OR request_subtype = ANY($4))
      AND ($5 IS NULL OR email = ANY($5))
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

COMMENT ON FUNCTION get_category_distribution IS 'Returns category distribution with total records (ALL) and unchanged records (good quality classifications: PERFECT_MATCH, STRUCTURAL_FIX, STYLISTIC_EDIT, no_significant_change, stylistic_preference) for pie chart. Supports dynamic date field (created_at or human_reply_date).';
