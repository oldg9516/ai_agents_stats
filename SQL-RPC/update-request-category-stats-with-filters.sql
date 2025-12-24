-- Update get_request_category_stats function to use support_dialogs for agent responses
-- This update changes:
-- 1. compared_count (Agent Responses) - counts threads that have an outgoing response (direction='out')
--    in support_dialogs with date > incoming message date (response came AFTER the request)
-- 2. avg_response_time - time from thread creation to first agent response (hours)
-- 3. p90_response_time - 90th percentile response time (hours)
--
-- Logic: A thread has an agent response if there's a record in support_dialogs
--        with the same ticket_id, direction='out', and date > original thread date

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
  -- Count all threads by category
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
  -- Get the date of the original incoming message for each thread
  thread_incoming_dates AS (
    SELECT
      sd.thread_id,
      sd.ticket_id,
      sd.date AS incoming_date
    FROM support_dialogs sd
    WHERE sd.direction = 'in'
  ),
  -- Find threads that have agent responses
  -- A thread has a response if there's an outgoing message (direction='out')
  -- in support_dialogs with the same ticket_id and date > original incoming date
  threads_with_responses AS (
    SELECT DISTINCT
      std.thread_id,
      std.ticket_id,
      std.request_subtype,
      std.created_at,
      -- Get the first outgoing response date for this thread
      (
        SELECT MIN(sd.date)
        FROM support_dialogs sd
        WHERE sd.ticket_id = std.ticket_id
          AND sd.direction = 'out'
          AND sd.date > tid.incoming_date
      ) AS first_response_date
    FROM support_threads_data std
    INNER JOIN thread_incoming_dates tid
      ON std.thread_id = tid.thread_id
    WHERE std.thread_date >= date_from
      AND std.thread_date <= date_to
      AND std.ticket_id IS NOT NULL
      -- Check if there's an outgoing response after this thread
      AND EXISTS (
        SELECT 1
        FROM support_dialogs sd
        WHERE sd.ticket_id = std.ticket_id
          AND sd.direction = 'out'
          AND sd.date > tid.incoming_date
      )
  ),
  -- Aggregate response stats by category
  agent_response_stats AS (
    SELECT
      CASE
        WHEN twr.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE twr.request_subtype
      END AS request_subtype,
      COUNT(*)::bigint AS responded_count,
      -- Average response time in hours (from thread creation to first agent response)
      ROUND(
        AVG(
          CASE
            WHEN twr.first_response_date IS NOT NULL AND twr.created_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (twr.first_response_date - twr.created_at)) / 3600
            ELSE NULL
          END
        )::numeric,
        1
      ) AS avg_response_time,
      -- P90 response time in hours
      ROUND(
        PERCENTILE_CONT(0.9) WITHIN GROUP (
          ORDER BY CASE
            WHEN twr.first_response_date IS NOT NULL AND twr.created_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (twr.first_response_date - twr.created_at)) / 3600
            ELSE NULL
          END
        )::numeric,
        1
      ) AS p90_response_time
    FROM threads_with_responses twr
    GROUP BY
      CASE
        WHEN twr.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE twr.request_subtype
      END
  )
  SELECT
    cs.request_type::text,
    cs.request_subtype::text,
    cs.category_count AS count,
    ROUND((cs.category_count::numeric / tr.total::numeric * 100), 1) AS percent,
    COALESCE(ars.responded_count, 0) AS compared_count,
    COALESCE(ars.avg_response_time, 0) AS avg_response_time,
    COALESCE(ars.p90_response_time, 0) AS p90_response_time
  FROM category_stats cs
  CROSS JOIN total_records tr
  LEFT JOIN agent_response_stats ars
    ON cs.request_subtype = ars.request_subtype
  ORDER BY
    -- 1. Request type priority: Lev Haolam Subscription first, then others
    CASE cs.request_type
      WHEN 'Lev Haolam Subscription' THEN 1
      WHEN 'Lev Haolam Shop' THEN 2
      WHEN 'Lev Haolam Subscription Retention' THEN 3
      ELSE 4
    END,
    -- 2. Within each request_type, sort subtypes: priority subtypes first, 'other' and NULL last
    CASE cs.request_subtype
      -- Priority subtypes for Lev Haolam Subscription
      WHEN 'shipping_or_delivery_question' THEN 1
      WHEN 'gratitude' THEN 2
      WHEN 'payment_question' THEN 3
      WHEN 'customization_request' THEN 4
      -- Other specific subtypes in alphabetical-ish order
      WHEN 'other' THEN 96
      WHEN 'multiply' THEN 97
      ELSE 50  -- All other subtypes in the middle
    END,
    -- 3. NULL subtypes at the very end
    CASE WHEN cs.request_subtype IS NULL THEN 1 ELSE 0 END,
    -- 4. Within same priority, sort by count descending
    cs.category_count DESC;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Add comment
COMMENT ON FUNCTION get_request_category_stats IS 'Returns request category statistics with agent response counts (threads with outgoing messages in support_dialogs where date > incoming date) and response time metrics (avg and P90 in hours)';
