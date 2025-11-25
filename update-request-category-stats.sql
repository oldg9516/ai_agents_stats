-- Update get_request_category_stats function to include compared_count
-- This function shows request category statistics with agent response counts

-- Drop all possible signatures of the function
DROP FUNCTION IF EXISTS get_request_category_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_request_category_stats(text, text);
DROP FUNCTION IF EXISTS get_request_category_stats();

CREATE OR REPLACE FUNCTION get_request_category_stats(
  date_from timestamp with time zone,
  date_to timestamp with time zone
)
RETURNS TABLE (
  request_type text,
  request_subtype text,
  count bigint,
  percent numeric,
  compared_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH total_records AS (
    SELECT COUNT(*)::bigint AS total
    FROM support_threads_data
    WHERE thread_date >= date_from AND thread_date <= date_to
  ),
  category_stats AS (
    SELECT
      std.request_type,
      CASE
        -- Group multiple subtypes (containing comma) as "multiply"
        WHEN std.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE std.request_subtype
      END AS request_subtype,
      COUNT(*)::bigint AS category_count
    FROM support_threads_data std
    WHERE std.thread_date >= date_from AND std.thread_date <= date_to
    GROUP BY
      std.request_type,
      CASE
        WHEN std.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE std.request_subtype
      END
  ),
  compared_stats AS (
    SELECT
      CASE
        WHEN ahc.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE ahc.request_subtype
      END AS request_subtype,
      COUNT(*)::bigint AS compared_count
    FROM ai_human_comparison ahc
    WHERE ahc.status = 'compared'
      AND ahc.created_at >= date_from
      AND ahc.created_at <= date_to
    GROUP BY
      CASE
        WHEN ahc.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE ahc.request_subtype
      END
  )
  SELECT
    cs.request_type::text,
    cs.request_subtype::text,
    cs.category_count AS count,
    ROUND((cs.category_count::numeric / tr.total::numeric * 100), 1) AS percent,
    COALESCE(cms.compared_count, 0) AS compared_count
  FROM category_stats cs
  CROSS JOIN total_records tr
  LEFT JOIN compared_stats cms
    ON cs.request_subtype = cms.request_subtype
  ORDER BY cs.category_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_request_category_stats IS 'Returns request category statistics with agent response counts (status = compared)';
