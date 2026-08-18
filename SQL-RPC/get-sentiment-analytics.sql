-- RPC functions for the AI Sentiment Analytics dashboard
--
-- Spec: IT_spec_sentiment_dashboard.docx (Irina, Customer Support Operations, Aug 2026).
--
-- Data model. The spec describes an "episode" (обращение) table; in our database that
-- table already exists as support_threads_data — one row per customer request, carrying
-- the AI sentiment and the AI subcategory for that request. So:
--   episode_id        = support_threads_data.thread_id
--   episode_at        = thread_date (never null where sentiment is set)
--   episode_sentiment = sentiment
--   subcategory       = request_subtype
--   sequence_number   = position of the request inside its ticket
--
-- Category ranks and weights are passed in as jsonb (p_ranks / p_weights) instead of
-- being hardcoded, so adding a sentiment category is a change to the config in
-- constants/sentiment-categories.ts and needs no SQL release (spec §12). A category
-- missing from p_weights still shows up in the distribution but is left out of the
-- index — an unweighted category must be a deliberate decision, not a silent zero.
--
-- Sequence numbers are computed over each ticket's whole life, never over the selected
-- window, so a ticket straddling the window edge still reports its true first and last
-- sentiment.

DROP FUNCTION IF EXISTS get_sentiment_timeseries(timestamptz, timestamptz, text, jsonb, jsonb);
DROP FUNCTION IF EXISTS get_sentiment_breakdown(timestamptz, timestamptz, text, jsonb);
DROP FUNCTION IF EXISTS get_sentiment_trajectory(timestamptz, timestamptz, jsonb);
DROP FUNCTION IF EXISTS get_sentiment_patterns(timestamptz, timestamptz, jsonb);
DROP FUNCTION IF EXISTS get_sentiment_agent_quality(timestamptz, timestamptz, jsonb, text);

-- =============================================================================
-- 1. TIME SERIES — episode metrics per bucket plus ticket-level resolution rates
-- =============================================================================
CREATE OR REPLACE FUNCTION get_sentiment_timeseries(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_granularity text DEFAULT 'week',
  p_ranks jsonb DEFAULT '{}'::jsonb,
  p_weights jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  period_start timestamptz,
  episode_count bigint,
  ticket_count bigint,
  sentiment_index numeric,
  distribution jsonb,
  improved_count bigint,
  worsened_count bigint,
  resolution_rate numeric,
  worsened_rate numeric
)
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '30s'
AS $$
DECLARE
  v_granularity text;
BEGIN
  -- Whitelist the unit: date_trunc takes it as text and this value reaches SQL
  v_granularity := CASE lower(coalesce(p_granularity, 'week'))
    WHEN 'day' THEN 'day'
    WHEN 'week' THEN 'week'
    WHEN 'month' THEN 'month'
    WHEN 'year' THEN 'year'
    ELSE 'week'
  END;

  RETURN QUERY
  WITH episodes AS (
    SELECT
      st.ticket_id,
      st.sentiment,
      st.thread_date AS episode_at,
      ROW_NUMBER() OVER (
        PARTITION BY st.ticket_id
        ORDER BY st.thread_date, st.thread_id
      ) AS sequence_number
    FROM support_threads_data st
    WHERE st.sentiment IS NOT NULL
      AND st.ticket_id IS NOT NULL
  ),
  -- Episode-level metrics: every request lands in the bucket of its own date
  episode_buckets AS (
    SELECT
      date_trunc(v_granularity, e.episode_at) AS period_start,
      e.sentiment,
      (p_weights ->> e.sentiment)::numeric AS weight
    FROM episodes e
    WHERE e.episode_at >= p_date_from
      AND e.episode_at < p_date_to
  ),
  episode_agg AS (
    SELECT
      eb.period_start,
      COUNT(*)::bigint AS episode_count,
      ROUND(AVG(eb.weight), 3) AS sentiment_index
    FROM episode_buckets eb
    GROUP BY eb.period_start
  ),
  distribution_agg AS (
    SELECT
      counts.period_start,
      jsonb_object_agg(counts.sentiment, counts.n) AS distribution
    FROM (
      SELECT eb.period_start, eb.sentiment, COUNT(*) AS n
      FROM episode_buckets eb
      GROUP BY eb.period_start, eb.sentiment
    ) counts
    GROUP BY counts.period_start
  ),
  -- Ticket-level metrics: a ticket belongs to the bucket of its first request, and its
  -- open/close sentiments come from all of its requests
  ticket_summary AS (
    SELECT
      e.ticket_id,
      MIN(e.episode_at) AS first_at,
      (ARRAY_AGG(e.sentiment ORDER BY e.sequence_number))[1] AS sentiment_open,
      (ARRAY_AGG(e.sentiment ORDER BY e.sequence_number DESC))[1] AS sentiment_close
    FROM episodes e
    GROUP BY e.ticket_id
  ),
  ticket_agg AS (
    SELECT
      date_trunc(v_granularity, ts.first_at) AS period_start,
      COUNT(*)::bigint AS ticket_count,
      COUNT(*) FILTER (
        WHERE (p_ranks ->> ts.sentiment_close)::numeric
            > (p_ranks ->> ts.sentiment_open)::numeric
      )::bigint AS improved_count,
      COUNT(*) FILTER (
        WHERE (p_ranks ->> ts.sentiment_close)::numeric
            < (p_ranks ->> ts.sentiment_open)::numeric
      )::bigint AS worsened_count
    FROM ticket_summary ts
    WHERE ts.first_at >= p_date_from
      AND ts.first_at < p_date_to
    GROUP BY 1
  )
  SELECT
    COALESCE(ea.period_start, ta.period_start) AS period_start,
    COALESCE(ea.episode_count, 0) AS episode_count,
    COALESCE(ta.ticket_count, 0) AS ticket_count,
    COALESCE(ea.sentiment_index, 0) AS sentiment_index,
    COALESCE(da.distribution, '{}'::jsonb) AS distribution,
    COALESCE(ta.improved_count, 0) AS improved_count,
    COALESCE(ta.worsened_count, 0) AS worsened_count,
    CASE WHEN COALESCE(ta.ticket_count, 0) > 0
      THEN ROUND(100.0 * ta.improved_count / ta.ticket_count, 1) ELSE 0 END AS resolution_rate,
    CASE WHEN COALESCE(ta.ticket_count, 0) > 0
      THEN ROUND(100.0 * ta.worsened_count / ta.ticket_count, 1) ELSE 0 END AS worsened_rate
  FROM episode_agg ea
  FULL OUTER JOIN ticket_agg ta ON ta.period_start = ea.period_start
  LEFT JOIN distribution_agg da ON da.period_start = ea.period_start
  ORDER BY 1;
END;
$$;

-- =============================================================================
-- 2. BREAKDOWN — one row per subcategory / tenure bucket / weekday
-- =============================================================================
CREATE OR REPLACE FUNCTION get_sentiment_breakdown(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_dimension text DEFAULT 'subcategory',
  p_ranks jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  bucket_key text,
  bucket_order numeric,
  episode_count bigint,
  distribution jsonb,
  severity_count bigint,
  severity_share numeric
)
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  WITH episodes AS (
    SELECT
      st.thread_id,
      st.sentiment,
      st.request_subtype,
      st.thread_date AS episode_at
    FROM support_threads_data st
    WHERE st.sentiment IS NOT NULL
      AND st.ticket_id IS NOT NULL
      AND st.thread_date >= p_date_from
      AND st.thread_date < p_date_to
  ),
  -- Tenure is measured at the moment of the request, never at report time, so a
  -- historical row keeps its bucket when the report is re-run (spec §5.1).
  -- The subscription date lives in the Zoho ticket payload and is missing for many
  -- customers; those requests are reported under 'unknown' rather than dropped.
  tenure AS (
    SELECT
      e.thread_id,
      FLOOR(
        EXTRACT(EPOCH FROM (
          e.episode_at
          - (sd.data -> 'payload' -> 'customFields' ->> 'First subscription date')::timestamptz
        )) / (30.44 * 86400)
      ) AS tenure_months
    FROM episodes e
    JOIN support_dialogs sd ON sd.thread_id = e.thread_id
    WHERE sd.data -> 'payload' -> 'customFields' ->> 'First subscription date'
          ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
  ),
  labelled AS (
    SELECT
      e.sentiment,
      CASE p_dimension
        WHEN 'subcategory' THEN COALESCE(NULLIF(e.request_subtype, ''), 'unknown')
        WHEN 'weekday' THEN to_char(e.episode_at, 'ID')
        WHEN 'tenure' THEN CASE
          WHEN t.tenure_months IS NULL OR t.tenure_months < 0 THEN 'unknown'
          WHEN t.tenure_months <= 1 THEN '0-1'
          WHEN t.tenure_months <= 3 THEN '2-3'
          WHEN t.tenure_months <= 6 THEN '4-6'
          WHEN t.tenure_months <= 11 THEN '7-11'
          WHEN t.tenure_months <= 18 THEN '12-18'
          ELSE '19+'
        END
        ELSE 'unknown'
      END AS bucket_key,
      CASE p_dimension
        WHEN 'weekday' THEN to_char(e.episode_at, 'ID')::numeric
        WHEN 'tenure' THEN CASE
          WHEN t.tenure_months IS NULL OR t.tenure_months < 0 THEN 99
          WHEN t.tenure_months <= 1 THEN 1
          WHEN t.tenure_months <= 3 THEN 2
          WHEN t.tenure_months <= 6 THEN 3
          WHEN t.tenure_months <= 11 THEN 4
          WHEN t.tenure_months <= 18 THEN 5
          ELSE 6
        END
        ELSE 0
      END AS bucket_order
    FROM episodes e
    LEFT JOIN tenure t ON t.thread_id = e.thread_id
  ),
  counts AS (
    SELECT l.bucket_key, l.bucket_order, l.sentiment, COUNT(*) AS n
    FROM labelled l
    GROUP BY 1, 2, 3
  )
  SELECT
    c.bucket_key,
    MAX(c.bucket_order) AS bucket_order,
    SUM(c.n)::bigint AS episode_count,
    jsonb_object_agg(c.sentiment, c.n) AS distribution,
    COALESCE(SUM(c.n) FILTER (WHERE (p_ranks ->> c.sentiment)::numeric <= 2), 0)::bigint
      AS severity_count,
    ROUND(
      100.0 * COALESCE(SUM(c.n) FILTER (WHERE (p_ranks ->> c.sentiment)::numeric <= 2), 0)
      / SUM(c.n), 1
    ) AS severity_share
  FROM counts c
  GROUP BY c.bucket_key
  ORDER BY 2, 3 DESC;
END;
$$;

-- =============================================================================
-- 3. TRAJECTORY — average index by request position, multi-request tickets only
-- =============================================================================
CREATE OR REPLACE FUNCTION get_sentiment_trajectory(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_weights jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  position_bucket int,
  episode_count bigint,
  sentiment_index numeric
)
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  WITH episodes AS (
    SELECT
      st.ticket_id,
      st.sentiment,
      st.thread_date AS episode_at,
      ROW_NUMBER() OVER (
        PARTITION BY st.ticket_id
        ORDER BY st.thread_date, st.thread_id
      ) AS sequence_number,
      COUNT(*) OVER (PARTITION BY st.ticket_id) AS episode_count
    FROM support_threads_data st
    WHERE st.sentiment IS NOT NULL
      AND st.ticket_id IS NOT NULL
  )
  SELECT
    LEAST(e.sequence_number, 4)::int AS position_bucket,
    COUNT(*)::bigint AS episode_count,
    ROUND(AVG((p_weights ->> e.sentiment)::numeric), 3) AS sentiment_index
  FROM episodes e
  WHERE e.episode_count >= 2
    AND e.episode_at >= p_date_from
    AND e.episode_at < p_date_to
  GROUP BY 1
  ORDER BY 1;
END;
$$;

-- =============================================================================
-- 4. PATTERNS — shape of the sentiment path across a ticket's requests
-- =============================================================================
CREATE OR REPLACE FUNCTION get_sentiment_patterns(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_ranks jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  pattern text,
  ticket_count bigint,
  share numeric
)
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  WITH episodes AS (
    SELECT
      st.ticket_id,
      st.sentiment,
      st.thread_date AS episode_at,
      ROW_NUMBER() OVER (
        PARTITION BY st.ticket_id
        ORDER BY st.thread_date, st.thread_id
      ) AS sequence_number
    FROM support_threads_data st
    WHERE st.sentiment IS NOT NULL
      AND st.ticket_id IS NOT NULL
  ),
  sequences AS (
    SELECT
      e.ticket_id,
      MIN(e.episode_at) AS first_at,
      COUNT(*) AS episode_count,
      ARRAY_AGG((p_ranks ->> e.sentiment)::numeric ORDER BY e.sequence_number) AS ranks
    FROM episodes e
    GROUP BY e.ticket_id
  ),
  -- A "reversal" is a direction change between neighbouring requests, so a path that
  -- only rises and a path that rises then falls are told apart (spec §6.2)
  directions AS (
    SELECT
      s.ticket_id,
      bool_or(d.step > 0) AS has_up,
      bool_or(d.step < 0) AS has_down
    FROM sequences s
    CROSS JOIN LATERAL (
      SELECT s.ranks[i + 1] - s.ranks[i] AS step
      FROM generate_subscripts(s.ranks, 1) AS i
      WHERE i < array_length(s.ranks, 1)
    ) d
    WHERE s.episode_count >= 2
      AND s.first_at >= p_date_from
      AND s.first_at < p_date_to
    GROUP BY s.ticket_id
  ),
  classified AS (
    SELECT
      CASE
        WHEN d.has_up AND d.has_down THEN 'volatile'
        WHEN d.has_up THEN 'improved'
        WHEN d.has_down THEN 'worsened'
        ELSE 'unchanged'
      END AS pattern
    FROM directions d
  )
  SELECT
    c.pattern,
    COUNT(*)::bigint AS ticket_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share
  FROM classified c
  GROUP BY c.pattern
  ORDER BY 2 DESC;
END;
$$;

-- =============================================================================
-- 5. AGENT QUALITY — episode-delta attribution (spec §3.5)
-- =============================================================================
-- The customer's mood on request n is a reaction to the reply they got to request n-1,
-- so each transition is credited to the agent who answered request n-1. The crediting
-- reply must sit between the two requests: an answer sent after the customer had already
-- written again is not what they were reacting to.
CREATE OR REPLACE FUNCTION get_sentiment_agent_quality(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_ranks jsonb DEFAULT '{}'::jsonb,
  p_excluded_email text DEFAULT 'api@levhaolam.com'
)
RETURNS TABLE (
  email text,
  transitions bigint,
  improved bigint,
  worsened bigint,
  unchanged bigint,
  improved_share numeric
)
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  -- Only tickets with a request inside the window matter
  WITH relevant_tickets AS (
    SELECT DISTINCT st.ticket_id
    FROM support_threads_data st
    WHERE st.sentiment IS NOT NULL
      AND st.ticket_id IS NOT NULL
      AND st.thread_date >= p_date_from
      AND st.thread_date < p_date_to
  ),
  episodes AS (
    SELECT
      st.ticket_id,
      st.thread_date AS episode_at,
      (p_ranks ->> st.sentiment)::numeric AS rank_value
    FROM support_threads_data st
    INNER JOIN relevant_tickets rt ON rt.ticket_id = st.ticket_id
    WHERE st.sentiment IS NOT NULL
  ),
  -- Consecutive request pairs; the previous request may predate the window
  pairs AS (
    SELECT
      e.ticket_id,
      e.episode_at AS curr_at,
      e.rank_value AS curr_rank,
      LAG(e.episode_at) OVER w AS prev_at,
      LAG(e.rank_value) OVER w AS prev_rank
    FROM episodes e
    WINDOW w AS (PARTITION BY e.ticket_id ORDER BY e.episode_at)
  ),
  transitions_in_window AS (
    SELECT p.ticket_id, p.prev_at, p.curr_at, p.curr_rank - p.prev_rank AS delta
    FROM pairs p
    WHERE p.prev_at IS NOT NULL
      AND p.prev_rank IS NOT NULL
      AND p.curr_rank IS NOT NULL
      AND p.curr_at >= p_date_from
      AND p.curr_at < p_date_to
  ),
  credited AS (
    SELECT t.delta, reply.email AS credited_agent
    FROM transitions_in_window t
    LEFT JOIN LATERAL (
      SELECT sd.email
      FROM support_dialogs sd
      WHERE sd.ticket_id = t.ticket_id
        AND sd.direction = 'out'
        AND sd.email IS NOT NULL
        AND sd.email <> p_excluded_email
        AND sd.date > t.prev_at
        AND sd.date <= t.curr_at
      ORDER BY sd.date
      LIMIT 1
    ) reply ON true
  )
  SELECT
    c.credited_agent::text AS email,
    COUNT(*)::bigint AS transitions,
    COUNT(*) FILTER (WHERE c.delta > 0)::bigint AS improved,
    COUNT(*) FILTER (WHERE c.delta < 0)::bigint AS worsened,
    COUNT(*) FILTER (WHERE c.delta = 0)::bigint AS unchanged,
    ROUND(100.0 * COUNT(*) FILTER (WHERE c.delta > 0) / COUNT(*), 1) AS improved_share
  FROM credited c
  WHERE c.credited_agent IS NOT NULL
  GROUP BY c.credited_agent
  ORDER BY transitions DESC;
END;
$$;
