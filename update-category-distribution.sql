-- SQL function for category distribution aggregation
-- This avoids the 1000 row limit by aggregating on the database side

DROP FUNCTION IF EXISTS get_category_distribution(timestamp with time zone, timestamp with time zone, text[], text[]);

CREATE OR REPLACE FUNCTION get_category_distribution(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL
)
RETURNS TABLE (
  category text,
  total_records bigint,
  unchanged_records bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    request_subtype AS category,
    COUNT(*)::bigint AS total_records,
    COUNT(*) FILTER (WHERE changed = false)::bigint AS unchanged_records
  FROM ai_human_comparison
  WHERE created_at >= p_from_date
    AND created_at <= p_to_date
    AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    AND (p_categories IS NULL OR request_subtype = ANY(p_categories))
  GROUP BY request_subtype
  ORDER BY total_records DESC;
END;
$$;

COMMENT ON FUNCTION get_category_distribution IS 'Returns category distribution with total and unchanged record counts for pie chart';
