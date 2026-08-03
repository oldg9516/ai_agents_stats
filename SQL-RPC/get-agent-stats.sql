-- RPC function for Agent Statistics
-- Replaces 40+ sequential HTTP requests with a single database query
--
-- v2: Added statement_timeout override, optimized CTE structure
-- v3: Fixed date filtering — answered_tickets uses agent reply date,
--     ai_stats uses human_reply_date instead of thread_date.
--     This captures agents responding to older tickets within the selected period.
-- v4: Added true First Response Time (frt_count/avg_frt/median_frt/p90_frt) measured
--     on support_dialogs: customer's request → first agent reply to it, credited to the
--     agent who replied. The pre-existing
--     avg/median/p90_response_time columns measure something else — the gap between
--     AI draft creation (ai_human_comparison.created_at) and the agent's reply, and
--     only for tickets that have an AI comparison record — so they stay for the
--     upcoming metrics but are no longer what the UI shows as FRT.
--     Also added p_agents (scopes the TOTAL row only) and an email='TOTAL' row, since
--     medians and percentiles cannot be aggregated from per-agent results client-side.
-- v5: FRT is measured per customer request instead of once per ticket — a single ticket
--     carries several requests, and measuring from the ticket's first message inflated
--     the numbers for long-lived tickets.
-- v6: answered_tickets counts tickets. It previously summed every incoming thread of the
--     answered tickets, including threads the agent never replied to, so it matched
--     neither tickets nor requests (sofia over 30 days: 948 shown, 594 tickets, 659
--     requests). frt_count is the request count and is now surfaced in the UI.

-- Drop both signatures: v4 adds p_agents, and leaving the 6-argument version in place
-- would create an overload with a stale return shape that calls could resolve to.
DROP FUNCTION IF EXISTS get_agent_stats(
  timestamp with time zone,
  timestamp with time zone,
  text[],
  text[],
  text[],
  text
);

DROP FUNCTION IF EXISTS get_agent_stats(
  timestamp with time zone,
  timestamp with time zone,
  text[],
  text[],
  text[],
  text,
  text[]
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
  p_excluded_email text DEFAULT 'api@levhaolam.com',
  -- Scopes the TOTAL row only. Per-agent rows are always returned in full so the
  -- UI's agent dropdown still sees every agent.
  p_agents text[] DEFAULT NULL
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
  p90_response_time numeric,
  frt_count bigint,
  avg_frt numeric,
  median_frt numeric,
  p90_frt numeric
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

  -- CTE 3: Tickets that actually contain a customer message
  answerable_tickets AS (
    SELECT DISTINCT et.ticket_id
    FROM eligible_threads et
    WHERE EXISTS (
      SELECT 1 FROM support_dialogs sd
      WHERE sd.thread_id = et.thread_id AND sd.direction = 'in'
    )
    AND et.ticket_id IN (SELECT ticket_id FROM agent_replies)
  ),

  -- CTE 4: Tickets answered per agent
  -- Agent "answered" if they sent an outgoing message in the date range on a ticket
  -- that has eligible threads with incoming messages.
  -- v6: counts the tickets themselves. It used to sum every incoming thread of those
  -- tickets, including threads the agent never replied to, which inflated the number
  -- well past both the ticket count and the request count.
  answered_per_agent AS (
    SELECT
      ar.email,
      COUNT(DISTINCT ar.ticket_id)::bigint AS answered_tickets
    FROM agent_replies ar
    INNER JOIN answerable_tickets att ON att.ticket_id = ar.ticket_id
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
  ),

  -- CTE 6: Agent replies with the previous reply on the same ticket, which bounds the
  -- request each reply answers. One ticket holds several customer requests, so FRT is
  -- measured per request rather than once per ticket.
  agent_out AS (
    SELECT
      sd.ticket_id,
      sd.email,
      sd.date AS out_date,
      LAG(sd.date) OVER (PARTITION BY sd.ticket_id ORDER BY sd.date) AS prev_out_date
    FROM support_dialogs sd
    WHERE sd.direction = 'out'
      AND sd.email IS NOT NULL
      AND sd.email <> p_excluded_email
      AND EXISTS (
        SELECT 1 FROM eligible_threads et WHERE et.ticket_id = sd.ticket_id
      )
  ),

  -- CTE 7: When the answered request started — the earliest customer message that arrived
  -- after the previous reply and before this one. Consecutive customer messages count as
  -- one request, so a burst is measured from the moment the customer first wrote.
  -- request_date IS NULL means the agent wrote without a new customer message
  -- (a follow-up), which is not a response and is dropped below.
  request_response AS (
    SELECT
      ao.email,
      ao.out_date,
      (
        SELECT MIN(sd.date)
        FROM support_dialogs sd
        WHERE sd.ticket_id = ao.ticket_id
          AND sd.direction = 'in'
          AND sd.date < ao.out_date
          AND (ao.prev_out_date IS NULL OR sd.date > ao.prev_out_date)
      ) AS request_date
    FROM agent_out ao
  ),

  -- CTE 8: First response times (hours) for replies that land inside the window
  frt_in_window AS (
    SELECT
      rr.email,
      EXTRACT(EPOCH FROM (rr.out_date - rr.request_date)) / 3600.0 AS frt_hours
    FROM request_response rr
    WHERE rr.request_date IS NOT NULL
      AND rr.out_date >= p_date_from
      AND rr.out_date < p_date_to
  ),

  -- CTE 9: FRT aggregates per agent
  frt_per_agent AS (
    SELECT
      fiw.email,
      COUNT(*)::bigint AS frt_count,
      ROUND(AVG(fiw.frt_hours)::numeric, 1) AS avg_frt,
      ROUND(
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY fiw.frt_hours))::numeric, 1
      ) AS median_frt,
      ROUND(
        (percentile_cont(0.9) WITHIN GROUP (ORDER BY fiw.frt_hours))::numeric, 1
      ) AS p90_frt
    FROM frt_in_window fiw
    GROUP BY fiw.email
  ),

  -- CTE 10: Every agent present in any of the three aggregates
  all_agents AS (
    SELECT apa.email FROM answered_per_agent apa
    UNION
    SELECT ais.email FROM ai_stats ais
    UNION
    SELECT fpa.email FROM frt_per_agent fpa
  ),

  -- CTE 11: Raw AI draft → reply durations for the agents the TOTAL row covers.
  -- The TOTAL row needs raw rows: a median of per-agent medians is not a median.
  selected_ahc_durations AS (
    SELECT
      EXTRACT(EPOCH FROM (ahc.human_reply_date - ahc.created_at)) / 3600.0 AS hours
    FROM ai_human_comparison ahc
    WHERE ahc.email IS NOT NULL
      AND ahc.email <> p_excluded_email
      AND ahc.human_reply_date >= p_date_from
      AND ahc.human_reply_date < p_date_to
      AND ahc.created_at IS NOT NULL
      AND ahc.human_reply_date > ahc.created_at
      AND (p_versions IS NULL OR ahc.prompt_version = ANY(p_versions))
      AND (p_categories IS NULL OR ahc.request_subtype = ANY(p_categories))
      AND (p_agents IS NULL OR ahc.email = ANY(p_agents))
  ),

  -- CTE 12: Raw first response times for the agents the TOTAL row covers
  selected_frt AS (
    SELECT fiw.frt_hours
    FROM frt_in_window fiw
    WHERE p_agents IS NULL OR fiw.email = ANY(p_agents)
  ),

  -- CTE 13: Counting columns of the TOTAL row
  selected_counts AS (
    SELECT
      -- Distinct tickets, not a sum of per-agent counts: one ticket answered by two
      -- agents is still one ticket
      COALESCE((
        SELECT COUNT(DISTINCT ar.ticket_id)
        FROM agent_replies ar
        INNER JOIN answerable_tickets att ON att.ticket_id = ar.ticket_id
        WHERE p_agents IS NULL OR ar.email = ANY(p_agents)
      ), 0)::bigint AS answered_tickets,
      COALESCE((
        SELECT SUM(ais.ai_reviewed) FROM ai_stats ais
        WHERE p_agents IS NULL OR ais.email = ANY(p_agents)
      ), 0)::bigint AS ai_reviewed,
      COALESCE((
        SELECT SUM(ais.changed) FROM ai_stats ais
        WHERE p_agents IS NULL OR ais.email = ANY(p_agents)
      ), 0)::bigint AS changed,
      COALESCE((
        SELECT SUM(ais.critical_errors) FROM ai_stats ais
        WHERE p_agents IS NULL OR ais.email = ANY(p_agents)
      ), 0)::bigint AS critical_errors
  ),

  -- CTE 14: TOTAL row — aggregated over raw rows, not over per-agent results
  total_row AS (
    SELECT
      'TOTAL'::text AS email,
      sc.answered_tickets AS answered_tickets,
      sc.ai_reviewed AS ai_reviewed,
      sc.changed AS changed,
      sc.critical_errors AS critical_errors,
      CASE
        WHEN sc.ai_reviewed > 0
        THEN ROUND(
          GREATEST(0, (sc.changed - sc.critical_errors)::numeric)
          / sc.ai_reviewed * 100, 1
        )
        ELSE 0
      END AS unnecessary_changes_pct,
      CASE
        WHEN sc.ai_reviewed > 0
        THEN ROUND(
          100 - GREATEST(0, (sc.changed - sc.critical_errors)::numeric)
          / sc.ai_reviewed * 100, 1
        )
        ELSE 0
      END AS ai_efficiency,
      COALESCE(ROUND((
        SELECT AVG(sad.hours) FROM selected_ahc_durations sad
      )::numeric, 1), 0) AS avg_response_time,
      COALESCE(ROUND((
        SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY sad.hours)
        FROM selected_ahc_durations sad
      )::numeric, 1), 0) AS median_response_time,
      COALESCE(ROUND((
        SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY sad.hours)
        FROM selected_ahc_durations sad
      )::numeric, 1), 0) AS p90_response_time,
      (SELECT COUNT(*) FROM selected_frt)::bigint AS frt_count,
      COALESCE(ROUND((
        SELECT AVG(sf.frt_hours) FROM selected_frt sf
      )::numeric, 1), 0) AS avg_frt,
      COALESCE(ROUND((
        SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY sf.frt_hours)
        FROM selected_frt sf
      )::numeric, 1), 0) AS median_frt,
      COALESCE(ROUND((
        SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY sf.frt_hours)
        FROM selected_frt sf
      )::numeric, 1), 0) AS p90_frt
    FROM selected_counts sc
  ),

  -- CTE 15: Per-agent rows (always every agent, so the UI's agent filter stays populated)
  agent_rows AS (
  SELECT
    aa.email::text AS email,
    COALESCE(apa.answered_tickets, 0) AS answered_tickets,
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
    COALESCE(ai.p90_resp_time, 0) AS p90_response_time,
    COALESCE(frt.frt_count, 0)::bigint AS frt_count,
    COALESCE(frt.avg_frt, 0) AS avg_frt,
    COALESCE(frt.median_frt, 0) AS median_frt,
    COALESCE(frt.p90_frt, 0) AS p90_frt
  FROM all_agents aa
  LEFT JOIN answered_per_agent apa ON apa.email = aa.email
  LEFT JOIN ai_stats ai ON ai.email = aa.email
  LEFT JOIN frt_per_agent frt ON frt.email = aa.email
  WHERE COALESCE(apa.answered_tickets, 0) > 0
     OR COALESCE(ai.ai_reviewed, 0) > 0
     OR COALESCE(frt.frt_count, 0) > 0
  )

  -- Final: per-agent rows plus the TOTAL row, slowest first response on top
  SELECT combined.*
  FROM (
    SELECT * FROM agent_rows
    UNION ALL
    SELECT * FROM total_row
  ) combined
  ORDER BY (combined.email = 'TOTAL'), combined.avg_frt DESC;
END;
$$;
