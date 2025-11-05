-- SQL Function for Request Categories Statistics with Date Filter
-- Deploy this to Supabase SQL Editor to UPDATE the existing function

CREATE OR REPLACE FUNCTION get_request_category_stats(
  date_from TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01'::TIMESTAMP WITH TIME ZONE,
  date_to TIMESTAMP WITH TIME ZONE DEFAULT '2100-01-01'::TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  request_type TEXT,
  request_subtype TEXT,
  count BIGINT,
  percent INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    request_type,
    CASE
      WHEN request_subtype LIKE '%,%' THEN 'multiply'
      ELSE request_subtype
    END AS request_subtype,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER ())::INTEGER AS percent
  FROM support_threads_data
  WHERE created_at >= date_from
    AND created_at < date_to
  GROUP BY request_type,
    CASE
      WHEN request_subtype LIKE '%,%' THEN 'multiply'
      ELSE request_subtype
    END
  ORDER BY count DESC;
$$;
