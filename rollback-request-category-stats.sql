-- Rollback: Remove compared_count from get_request_category_stats function
-- This restores the original function without compared_count field

-- Drop all possible signatures of the function
DROP FUNCTION IF EXISTS get_request_category_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_request_category_stats(text, text);
DROP FUNCTION IF EXISTS get_request_category_stats();

-- Restore original function (without compared_count)
CREATE OR REPLACE FUNCTION get_request_category_stats(
  date_from timestamp with time zone,
  date_to timestamp with time zone
)
RETURNS TABLE (
  request_type text,
  request_subtype text,
  count bigint,
  percent numeric
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
  )
  SELECT
    cs.request_type,
    cs.request_subtype,
    cs.category_count AS count,
    ROUND((cs.category_count::numeric / tr.total::numeric * 100), 1) AS percent
  FROM category_stats cs
  CROSS JOIN total_records tr
  ORDER BY cs.category_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_request_category_stats IS 'Returns request category statistics';
