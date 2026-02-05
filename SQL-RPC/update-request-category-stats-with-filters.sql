-- Update get_request_category_stats function to add NULL subtype breakdown
-- This update adds:
-- 1. NULL subtype classification by reason (Reply not required, Identifying issues, etc.)
--
-- NULL subtype classification priority:
-- 1. Reply not required - requires_reply = false
-- 2. Identifying — Many users - status = 'Identifying — Many users'
-- 3. Identifying — Not found - status = 'Identifying — Not found'
-- 4. Identifying - status = 'Identifying'
-- 5. Subscription info missing - requires_subscription_info = true AND subscription_info IS NULL
-- 6. Other - remaining NULL subtype cases

DROP FUNCTION IF EXISTS get_request_category_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_request_category_stats(text, text);
DROP FUNCTION IF EXISTS get_request_category_stats();

CREATE OR REPLACE FUNCTION public.get_request_category_stats(
  date_from timestamp with time zone,
  date_to timestamp with time zone
)
RETURNS TABLE(
  request_type text,
  request_subtype text,
  count bigint,
  percent numeric,
  compared_count bigint,
  avg_response_time numeric,
  p90_response_time numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH total_records AS (
    SELECT COUNT(*)::bigint AS total
    FROM support_threads_data
    WHERE thread_date >= date_from AND thread_date < date_to
  ),
  -- Count all threads by category with NULL subtype breakdown
  category_stats AS (
    SELECT
      std.request_type,
      CASE
        -- Group multiple subtypes (containing comma) as "multiply"
        WHEN std.request_subtype LIKE '%,%' THEN 'multiply'
        -- NULL subtype breakdown by reason (priority order)
        WHEN std.request_subtype IS NULL THEN
          CASE
            -- Priority 1: Reply not required
            WHEN std.requires_reply = false THEN 'NULL (Reply not required)'
            -- Priority 2-4: Identification issues (by specific status)
            WHEN std.status = 'Identifying — Many users' THEN 'NULL (Identifying — Many users)'
            WHEN std.status = 'Identifying — Not found' THEN 'NULL (Identifying — Not found)'
            WHEN std.status = 'Identifying' THEN 'NULL (Identifying)'
            -- Priority 5: Subscription info missing
            WHEN std.requires_subscription_info = true AND std.subscription_info IS NULL
              THEN 'NULL (Subscription info missing)'
            -- Priority 6: Other (catch-all)
            ELSE 'NULL (Other)'
          END
        ELSE std.request_subtype
      END AS request_subtype,
      COUNT(*)::bigint AS category_count
    FROM support_threads_data std
    WHERE std.thread_date >= date_from AND std.thread_date < date_to
    GROUP BY
      std.request_type,
      CASE
        WHEN std.request_subtype LIKE '%,%' THEN 'multiply'
        WHEN std.request_subtype IS NULL THEN
          CASE
            WHEN std.requires_reply = false THEN 'NULL (Reply not required)'
            WHEN std.status = 'Identifying — Many users' THEN 'NULL (Identifying — Many users)'
            WHEN std.status = 'Identifying — Not found' THEN 'NULL (Identifying — Not found)'
            WHEN std.status = 'Identifying' THEN 'NULL (Identifying)'
            WHEN std.requires_subscription_info = true AND std.subscription_info IS NULL
              THEN 'NULL (Subscription info missing)'
            ELSE 'NULL (Other)'
          END
        ELSE std.request_subtype
      END
  ),
  -- Keep existing compared_stats logic from ai_human_comparison
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
      AND ahc.created_at < date_to
      AND ahc.change_classification IS NOT NULL
      AND ahc.change_classification != 'context_shift'
      AND ahc.email NOT IN ('api@levhaolam.com', 'samantha@levhaolam.com')
    GROUP BY
      CASE
        WHEN ahc.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE ahc.request_subtype
      END
  ),
  -- Keep existing response_time_stats logic from ai_human_comparison
  response_time_stats AS (
    SELECT
      CASE
        WHEN ahc.request_subtype LIKE '%,%' THEN 'multiply'
        ELSE ahc.request_subtype
      END AS request_subtype,
      ROUND(
        AVG(
          EXTRACT(EPOCH FROM (ahc.human_reply_date - ahc.created_at)) / 3600
        )::numeric,
        1
      ) AS avg_response_time,
      ROUND(
        PERCENTILE_CONT(0.9) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (ahc.human_reply_date - ahc.created_at)) / 3600
        )::numeric,
        1
      ) AS p90_response_time
    FROM ai_human_comparison ahc
    WHERE ahc.created_at >= date_from
      AND ahc.created_at < date_to
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
  ORDER BY
    -- 1. Request type priority (existing)
    CASE cs.request_type
      WHEN 'Lev Haolam Subscription' THEN 1
      WHEN 'Lev Haolam Subscription Retention' THEN 2
      WHEN 'Lev Haolam Shop' THEN 3
      WHEN 'Lev Haolam Tour' THEN 4
      WHEN 'Other' THEN 5
      ELSE 6
    END,
    -- 2. Subtype priority (existing order preserved)
    CASE cs.request_subtype
      WHEN 'shipping_or_delivery_question' THEN 1
      WHEN 'gratitude' THEN 2
      WHEN 'payment_question' THEN 3
      WHEN 'damaged_or_leaking_item_report' THEN 4
      WHEN 'recipient_or_address_change' THEN 5
      WHEN 'frequency_change_request' THEN 6
      WHEN 'customization_request' THEN 7
      WHEN 'skip_or_pause_request' THEN 8
      WHEN 'other_question' THEN 9
      WHEN 'multiply' THEN 10
      WHEN 'no_action_needed' THEN 11
      WHEN 'refund_request' THEN 12
      WHEN 'additional_or_gift_box_request' THEN 13
      WHEN 'clarification_needed' THEN 14
      WHEN 'donation' THEN 15
      -- Retention subtypes
      WHEN 'retention_primary_request' THEN 16
      WHEN 'retention_repeated_request' THEN 17
      -- NULL reasons at the end
      WHEN 'NULL (Reply not required)' THEN 90
      WHEN 'NULL (Identifying — Many users)' THEN 91
      WHEN 'NULL (Identifying — Not found)' THEN 92
      WHEN 'NULL (Identifying)' THEN 93
      WHEN 'NULL (Subscription info missing)' THEN 94
      WHEN 'NULL (Other)' THEN 95
      ELSE 99
    END;
END;
$function$;

-- Add comment
COMMENT ON FUNCTION get_request_category_stats IS 'Returns request category statistics with NULL subtype breakdown by reason';
