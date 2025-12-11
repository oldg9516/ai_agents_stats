-- Update get_request_category_stats function to include response time metrics
-- This update adds:
-- 1. avg_response_time - average time from request creation to agent response (hours)
-- 2. p90_response_time - 90th percentile response time (hours)

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
  compared_count bigint,
  avg_response_time numeric,
  p90_response_time numeric
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
      AND ahc.change_classification IS NOT NULL
      AND ahc.change_classification != 'context_shift'
    GROUP BY
      CASE
        WHEN ahc.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE ahc.request_subtype
      END
  ),
  -- Response time statistics from ai_human_comparison
  response_time_stats AS (
    SELECT
      CASE
        WHEN ahc.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE ahc.request_subtype
      END AS request_subtype,
      -- Average response time in hours
      ROUND(
        AVG(
          EXTRACT(EPOCH FROM (ahc.human_reply_date - ahc.created_at)) / 3600
        )::numeric,
        1
      ) AS avg_response_time,
      -- P90 response time in hours (90% of tickets answered within this time)
      ROUND(
        PERCENTILE_CONT(0.9) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (ahc.human_reply_date - ahc.created_at)) / 3600
        )::numeric,
        1
      ) AS p90_response_time
    FROM ai_human_comparison ahc
    WHERE ahc.created_at >= date_from
      AND ahc.created_at <= date_to
      AND ahc.human_reply_date IS NOT NULL
      AND ahc.created_at IS NOT NULL
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
    COALESCE(cms.compared_count, 0) AS compared_count,
    COALESCE(rts.avg_response_time, 0) AS avg_response_time,
    COALESCE(rts.p90_response_time, 0) AS p90_response_time
  FROM category_stats cs
  CROSS JOIN total_records tr
  LEFT JOIN compared_stats cms
    ON cs.request_subtype = cms.request_subtype
  LEFT JOIN response_time_stats rts
    ON cs.request_subtype = rts.request_subtype
  ORDER BY cs.category_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_request_category_stats IS 'Returns request category statistics with agent response counts and response time metrics (avg and P90 in hours)';
