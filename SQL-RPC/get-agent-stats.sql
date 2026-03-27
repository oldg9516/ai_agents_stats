-- RPC function for Agent Statistics
-- Replaces 40+ sequential HTTP requests with a single database query
--
-- v2: Added statement_timeout override, optimized CTE structure
-- v3: Fixed date filtering — answered_tickets uses agent reply date,
--     ai_stats uses human_reply_date instead of thread_date.
--     This captures agents responding to older tickets within the selected period.

DROP FUNCTION IF EXISTS get_agent_stats(
  timestamp with time zone,
  timestamp with time zone,
  text[],
  text[],
  text[],
  text
);

CREATE OR REPLACE FUNCTION get_agent_stats(
  p_date_from timestamp with time zone,
  p_date_to timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_critical_classifications text[] DEFAULT ARRAY[
    'critical_error', 'meaningful_improvement',
    'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION',
    'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT'
  ],
  p_excluded_email text DEFAULT 'api@levhaolam.com'
)
RETURNS TABLE (
  email text,
  answered_tickets bigint,
  ai_reviewed bigint,
  changed bigint,
  critical_errors bigint,
  unnecessary_changes_pct numeric,
  ai_efficiency numeric,
  avg_response_time numeric,
  median_response_time numeric,
  p90_response_time numeric
)
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- CTE 1: All threads with optional version/category filters (no date filter)
  -- Used to find ticket_ids for answered_tickets calculation
  eligible_threads AS (
    SELECT
      st.thread_id,
      st.ticket_id
    FROM support_threads_data st
    WHERE st.ticket_id IS NOT NULL
      AND (p_versions IS NULL OR st.prompt_version = ANY(p_versions))
      AND (p_categories IS NULL OR st.request_subtype = ANY(p_categories))
  ),

  -- CTE 2: Agent outgoing messages within the date range
  -- This is the key change: filter by agent reply date, not thread creation date
  agent_replies AS (
    SELECT DISTINCT
      sd.email,
      sd.ticket_id
    FROM support_dialogs sd
    WHERE sd.direction = 'out'
      AND sd.email IS NOT NULL
      AND sd.email <> p_excluded_email
      AND sd.date >= p_date_from
      AND sd.date < p_date_to
      AND EXISTS (
        SELECT 1 FROM eligible_threads et WHERE et.ticket_id = sd.ticket_id
      )
  ),

  -- CTE 3: Count threads per ticket that have incoming messages (for answered_tickets count)
  ticket_thread_counts AS (
    SELECT
      et.ticket_id,
      COUNT(DISTINCT et.thread_id) AS thread_count
    FROM eligible_threads et
    WHERE EXISTS (
      SELECT 1 FROM support_dialogs sd
      WHERE sd.thread_id = et.thread_id AND sd.direction = 'in'
    )
    AND et.ticket_id IN (SELECT ticket_id FROM agent_replies)
    GROUP BY et.ticket_id
  ),

  -- CTE 4: Count answered tickets per agent
  -- Agent "answered" if they sent an outgoing message in the date range
  -- on a ticket that has eligible threads with incoming messages
  answered_per_agent AS (
    SELECT
      ar.email,
      SUM(ttc.thread_count)::bigint AS answered_tickets
    FROM agent_replies ar
    INNER JOIN ticket_thread_counts ttc ON ttc.ticket_id = ar.ticket_id
    GROUP BY ar.email
  ),

  -- CTE 5: AI comparison stats per agent
  -- Filter by human_reply_date (when agent actually reviewed) instead of thread_date
  ai_stats AS (
    SELECT
      ahc.email,
      COUNT(*) FILTER (WHERE ahc.change_classification IS NOT NULL) AS ai_reviewed,
      COUNT(*) FILTER (WHERE ahc.changed = true AND ahc.change_classification IS NOT NULL) AS changed,
      COUNT(*) FILTER (WHERE ahc.change_classification = ANY(p_critical_classifications)) AS critical_errors,
      ROUND(AVG(
        CASE
          WHEN ahc.human_reply_date IS NOT NULL AND ahc.created_at IS NOT NULL
               AND ahc.human_reply_date > ahc.created_at
          THEN EXTRACT(EPOCH FROM (ahc.human_reply_date - ahc.created_at)) / 3600.0
        END
      )::numeric, 1) AS avg_resp_time,
      ROUND(percentile_cont(0.5) WITHIN GROUP (
        ORDER BY
          CASE
            WHEN ahc.human_reply_date IS NOT NULL AND ahc.created_at IS NOT NULL
                 AND ahc.human_reply_date > ahc.created_at
            THEN EXTRACT(EPOCH FROM (ahc.human_reply_date - ahc.created_at)) / 3600.0
          END
      )::numeric, 1) AS median_resp_time,
      ROUND(percentile_cont(0.9) WITHIN GROUP (
        ORDER BY
          CASE
            WHEN ahc.human_reply_date IS NOT NULL AND ahc.created_at IS NOT NULL
                 AND ahc.human_reply_date > ahc.created_at
            THEN EXTRACT(EPOCH FROM (ahc.human_reply_date - ahc.created_at)) / 3600.0
          END
      )::numeric, 1) AS p90_resp_time
    FROM ai_human_comparison ahc
    WHERE ahc.email IS NOT NULL
      AND ahc.email <> p_excluded_email
      AND ahc.human_reply_date >= p_date_from
      AND ahc.human_reply_date < p_date_to
      AND (p_versions IS NULL OR ahc.prompt_version = ANY(p_versions))
      AND (p_categories IS NULL OR ahc.request_subtype = ANY(p_categories))
    GROUP BY ahc.email
  )

  -- Final: FULL JOIN and calculate efficiency
  SELECT
    COALESCE(aa.email, ai.email)::text AS email,
    COALESCE(aa.answered_tickets, 0) AS answered_tickets,
    COALESCE(ai.ai_reviewed, 0) AS ai_reviewed,
    COALESCE(ai.changed, 0) AS changed,
    COALESCE(ai.critical_errors, 0) AS critical_errors,
    CASE
      WHEN COALESCE(ai.ai_reviewed, 0) > 0
      THEN ROUND(
        GREATEST(0, (COALESCE(ai.changed, 0) - COALESCE(ai.critical_errors, 0))::numeric)
        / ai.ai_reviewed * 100, 1
      )
      ELSE 0
    END AS unnecessary_changes_pct,
    CASE
      WHEN COALESCE(ai.ai_reviewed, 0) > 0
      THEN ROUND(
        100 - GREATEST(0, (COALESCE(ai.changed, 0) - COALESCE(ai.critical_errors, 0))::numeric)
        / ai.ai_reviewed * 100, 1
      )
      ELSE 0
    END AS ai_efficiency,
    COALESCE(ai.avg_resp_time, 0) AS avg_response_time,
    COALESCE(ai.median_resp_time, 0) AS median_response_time,
    COALESCE(ai.p90_resp_time, 0) AS p90_response_time
  FROM answered_per_agent aa
  FULL OUTER JOIN ai_stats ai ON ai.email = aa.email
  WHERE COALESCE(aa.answered_tickets, 0) > 0 OR COALESCE(ai.ai_reviewed, 0) > 0
  ORDER BY
    CASE
      WHEN COALESCE(ai.ai_reviewed, 0) > 0
      THEN 100 - GREATEST(0, (COALESCE(ai.changed, 0) - COALESCE(ai.critical_errors, 0))::numeric)
        / ai.ai_reviewed * 100
      ELSE 0
    END DESC;
END;
$$;
