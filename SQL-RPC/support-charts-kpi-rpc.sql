-- Support Charts & KPI RPC Functions
-- Replaces JS-side batch aggregation with SQL-level aggregation
-- Execute in Supabase SQL Editor
-- Generated: 2026-02-07

-- ===========================================
-- 1. get_support_status_distribution
-- Replaces: fetchStatusDistribution in charts.ts
-- Returns: status breakdown with counts and percentages
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_support_status_distribution(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_statuses text[] DEFAULT NULL,
  p_request_types text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_requirements text[] DEFAULT NULL,
  p_versions text[] DEFAULT NULL
)
RETURNS TABLE(status text, count bigint, percentage numeric)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT COALESCE(t.status, 'unknown') AS status
    FROM support_threads_data t
    WHERE t.created_at >= p_date_from
      AND t.created_at < p_date_to
      AND (p_statuses IS NULL OR t.status = ANY(p_statuses))
      AND (p_request_types IS NULL OR t.request_type = ANY(p_request_types))
      AND (p_categories IS NULL OR t.request_subtype = ANY(p_categories))
      AND (p_versions IS NULL OR t.prompt_version = ANY(p_versions))
      AND (p_requirements IS NULL OR (
        (NOT 'requires_reply' = ANY(p_requirements) OR t.requires_reply = true) AND
        (NOT 'requires_identification' = ANY(p_requirements) OR t.requires_identification = true) AND
        (NOT 'requires_editing' = ANY(p_requirements) OR t.requires_editing = true) AND
        (NOT 'requires_subscription_info' = ANY(p_requirements) OR t.requires_subscription_info = true) AND
        (NOT 'requires_tracking_info' = ANY(p_requirements) OR t.requires_tracking_info = true)
      ))
  ),
  grouped AS (
    SELECT f.status, COUNT(*) AS count
    FROM filtered f
    GROUP BY f.status
  )
  SELECT
    g.status,
    g.count,
    ROUND(g.count * 100.0 / NULLIF(SUM(g.count) OVER (), 0), 2) AS percentage
  FROM grouped g;
$$;

-- ===========================================
-- 2. get_support_resolution_time
-- Replaces: fetchResolutionTimeData in charts.ts
-- Returns: average resolution time by week
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_support_resolution_time(
  p_date_from timestamptz,
  p_date_to timestamptz
)
RETURNS TABLE(week_start text, avg_resolution_time numeric, thread_count bigint)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('week', c.created_at), 'YYYY-MM-DD') AS week_start,
    ROUND(AVG(EXTRACT(EPOCH FROM (c.human_reply_date - c.created_at)) / 3600)::numeric, 1) AS avg_resolution_time,
    COUNT(*) AS thread_count
  FROM ai_human_comparison c
  WHERE c.created_at >= p_date_from
    AND c.created_at < p_date_to
    AND c.human_reply_date IS NOT NULL
    AND EXTRACT(EPOCH FROM (c.human_reply_date - c.created_at)) / 3600 BETWEEN 0 AND 720
  GROUP BY DATE_TRUNC('week', c.created_at)
  ORDER BY DATE_TRUNC('week', c.created_at);
$$;

-- ===========================================
-- 3. get_support_sankey_data
-- Replaces: fetchSankeyData in charts.ts
-- Returns: 6 counts for AI draft flow diagram
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_support_sankey_data(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_statuses text[] DEFAULT NULL,
  p_request_types text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_requirements text[] DEFAULT NULL,
  p_versions text[] DEFAULT NULL
)
RETURNS TABLE(
  created bigint,
  used_as_is bigint,
  edited bigint,
  rejected bigint,
  resolved bigint,
  pending bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE t.ai_draft_reply IS NOT NULL) AS created,
    COUNT(*) FILTER (WHERE t.ai_draft_reply IS NOT NULL AND COALESCE(t.requires_editing, false) = false) AS used_as_is,
    COUNT(*) FILTER (WHERE t.ai_draft_reply IS NOT NULL AND COALESCE(t.requires_editing, false) = true) AS edited,
    COUNT(*) FILTER (WHERE t.ai_draft_reply IS NULL) AS rejected,
    COUNT(*) FILTER (WHERE t.ai_draft_reply IS NOT NULL AND t.status = 'resolved') AS resolved,
    COUNT(*) FILTER (WHERE t.ai_draft_reply IS NOT NULL AND t.status != 'resolved') AS pending
  FROM support_threads_data t
  WHERE t.created_at >= p_date_from
    AND t.created_at < p_date_to
    AND (p_statuses IS NULL OR t.status = ANY(p_statuses))
    AND (p_request_types IS NULL OR t.request_type = ANY(p_request_types))
    AND (p_categories IS NULL OR t.request_subtype = ANY(p_categories))
    AND (p_versions IS NULL OR t.prompt_version = ANY(p_versions))
    AND (p_requirements IS NULL OR (
      (NOT 'requires_reply' = ANY(p_requirements) OR t.requires_reply = true) AND
      (NOT 'requires_identification' = ANY(p_requirements) OR t.requires_identification = true) AND
      (NOT 'requires_editing' = ANY(p_requirements) OR t.requires_editing = true) AND
      (NOT 'requires_subscription_info' = ANY(p_requirements) OR t.requires_subscription_info = true) AND
      (NOT 'requires_tracking_info' = ANY(p_requirements) OR t.requires_tracking_info = true)
    ));
$$;

-- ===========================================
-- 4. get_support_correlation_matrix
-- Replaces: fetchCorrelationMatrix in charts.ts
-- Returns: 25 rows (5x5 matrix) of requirement co-occurrence
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_support_correlation_matrix(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_statuses text[] DEFAULT NULL,
  p_request_types text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_versions text[] DEFAULT NULL
)
RETURNS TABLE(x text, y text, value numeric)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT
      SUM(CASE WHEN t.requires_reply THEN 1 ELSE 0 END) AS rr,
      SUM(CASE WHEN t.requires_identification THEN 1 ELSE 0 END) AS ri,
      SUM(CASE WHEN t.requires_editing THEN 1 ELSE 0 END) AS re,
      SUM(CASE WHEN t.requires_subscription_info THEN 1 ELSE 0 END) AS rs,
      SUM(CASE WHEN t.requires_tracking_info THEN 1 ELSE 0 END) AS rt,
      SUM(CASE WHEN t.requires_reply AND t.requires_identification THEN 1 ELSE 0 END) AS rr_ri,
      SUM(CASE WHEN t.requires_reply AND t.requires_editing THEN 1 ELSE 0 END) AS rr_re,
      SUM(CASE WHEN t.requires_reply AND t.requires_subscription_info THEN 1 ELSE 0 END) AS rr_rs,
      SUM(CASE WHEN t.requires_reply AND t.requires_tracking_info THEN 1 ELSE 0 END) AS rr_rt,
      SUM(CASE WHEN t.requires_identification AND t.requires_editing THEN 1 ELSE 0 END) AS ri_re,
      SUM(CASE WHEN t.requires_identification AND t.requires_subscription_info THEN 1 ELSE 0 END) AS ri_rs,
      SUM(CASE WHEN t.requires_identification AND t.requires_tracking_info THEN 1 ELSE 0 END) AS ri_rt,
      SUM(CASE WHEN t.requires_editing AND t.requires_subscription_info THEN 1 ELSE 0 END) AS re_rs,
      SUM(CASE WHEN t.requires_editing AND t.requires_tracking_info THEN 1 ELSE 0 END) AS re_rt,
      SUM(CASE WHEN t.requires_subscription_info AND t.requires_tracking_info THEN 1 ELSE 0 END) AS rs_rt,
      COUNT(*) AS total
    FROM support_threads_data t
    WHERE t.created_at >= p_date_from
      AND t.created_at < p_date_to
      AND (p_statuses IS NULL OR t.status = ANY(p_statuses))
      AND (p_request_types IS NULL OR t.request_type = ANY(p_request_types))
      AND (p_categories IS NULL OR t.request_subtype = ANY(p_categories))
      AND (p_versions IS NULL OR t.prompt_version = ANY(p_versions))
  )
  SELECT pairs.x, pairs.y,
    COALESCE(ROUND(pairs.cnt::numeric / NULLIF(c.total, 0), 4), 0) AS value
  FROM counts c,
  LATERAL (VALUES
    ('requires_reply', 'requires_reply', c.rr),
    ('requires_reply', 'requires_identification', c.rr_ri),
    ('requires_reply', 'requires_editing', c.rr_re),
    ('requires_reply', 'requires_subscription_info', c.rr_rs),
    ('requires_reply', 'requires_tracking_info', c.rr_rt),
    ('requires_identification', 'requires_reply', c.rr_ri),
    ('requires_identification', 'requires_identification', c.ri),
    ('requires_identification', 'requires_editing', c.ri_re),
    ('requires_identification', 'requires_subscription_info', c.ri_rs),
    ('requires_identification', 'requires_tracking_info', c.ri_rt),
    ('requires_editing', 'requires_reply', c.rr_re),
    ('requires_editing', 'requires_identification', c.ri_re),
    ('requires_editing', 'requires_editing', c.re),
    ('requires_editing', 'requires_subscription_info', c.re_rs),
    ('requires_editing', 'requires_tracking_info', c.re_rt),
    ('requires_subscription_info', 'requires_reply', c.rr_rs),
    ('requires_subscription_info', 'requires_identification', c.ri_rs),
    ('requires_subscription_info', 'requires_editing', c.re_rs),
    ('requires_subscription_info', 'requires_subscription_info', c.rs),
    ('requires_subscription_info', 'requires_tracking_info', c.rs_rt),
    ('requires_tracking_info', 'requires_reply', c.rr_rt),
    ('requires_tracking_info', 'requires_identification', c.ri_rt),
    ('requires_tracking_info', 'requires_editing', c.re_rt),
    ('requires_tracking_info', 'requires_subscription_info', c.rs_rt),
    ('requires_tracking_info', 'requires_tracking_info', c.rt)
  ) AS pairs(x, y, cnt);
$$;

-- ===========================================
-- 5. get_support_kpis
-- Replaces: fetchSupportKPIs in kpi.ts
-- Returns: 10 counts (current + previous period)
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_support_kpis(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_prev_date_from timestamptz,
  p_statuses text[] DEFAULT NULL,
  p_request_types text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_requirements text[] DEFAULT NULL,
  p_versions text[] DEFAULT NULL
)
RETURNS TABLE(
  current_total bigint,
  current_requires_reply bigint,
  current_resolved bigint,
  current_requirements_sum bigint,
  current_agent_response_count bigint,
  previous_total bigint,
  previous_requires_reply bigint,
  previous_resolved bigint,
  previous_requirements_sum bigint,
  previous_agent_response_count bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_period AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE t.requires_reply = true) AS req_reply,
      COUNT(*) FILTER (WHERE t.status = 'Reply is ready') AS resolved,
      COALESCE(SUM(
        (CASE WHEN t.requires_reply THEN 1 ELSE 0 END) +
        (CASE WHEN t.requires_identification THEN 1 ELSE 0 END) +
        (CASE WHEN t.requires_editing THEN 1 ELSE 0 END) +
        (CASE WHEN t.requires_subscription_info THEN 1 ELSE 0 END) +
        (CASE WHEN t.requires_tracking_info THEN 1 ELSE 0 END)
      ), 0) AS req_sum
    FROM support_threads_data t
    WHERE t.created_at >= p_date_from
      AND t.created_at < p_date_to
      AND (p_statuses IS NULL OR t.status = ANY(p_statuses))
      AND (p_request_types IS NULL OR t.request_type = ANY(p_request_types))
      AND (p_categories IS NULL OR t.request_subtype = ANY(p_categories))
      AND (p_versions IS NULL OR t.prompt_version = ANY(p_versions))
      AND (p_requirements IS NULL OR (
        (NOT 'requires_reply' = ANY(p_requirements) OR t.requires_reply = true) AND
        (NOT 'requires_identification' = ANY(p_requirements) OR t.requires_identification = true) AND
        (NOT 'requires_editing' = ANY(p_requirements) OR t.requires_editing = true) AND
        (NOT 'requires_subscription_info' = ANY(p_requirements) OR t.requires_subscription_info = true) AND
        (NOT 'requires_tracking_info' = ANY(p_requirements) OR t.requires_tracking_info = true)
      ))
  ),
  current_versions AS (
    SELECT DISTINCT t.prompt_version
    FROM support_threads_data t
    WHERE t.created_at >= p_date_from
      AND t.created_at < p_date_to
      AND t.prompt_version IS NOT NULL
      AND (p_statuses IS NULL OR t.status = ANY(p_statuses))
      AND (p_request_types IS NULL OR t.request_type = ANY(p_request_types))
      AND (p_categories IS NULL OR t.request_subtype = ANY(p_categories))
      AND (p_versions IS NULL OR t.prompt_version = ANY(p_versions))
      AND (p_requirements IS NULL OR (
        (NOT 'requires_reply' = ANY(p_requirements) OR t.requires_reply = true) AND
        (NOT 'requires_identification' = ANY(p_requirements) OR t.requires_identification = true) AND
        (NOT 'requires_editing' = ANY(p_requirements) OR t.requires_editing = true) AND
        (NOT 'requires_subscription_info' = ANY(p_requirements) OR t.requires_subscription_info = true) AND
        (NOT 'requires_tracking_info' = ANY(p_requirements) OR t.requires_tracking_info = true)
      ))
  ),
  current_agent AS (
    SELECT COUNT(*) AS cnt
    FROM ai_human_comparison c
    WHERE c.prompt_version IN (SELECT prompt_version FROM current_versions)
  ),
  previous_period AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE t.requires_reply = true) AS req_reply,
      COUNT(*) FILTER (WHERE t.status = 'Reply is ready') AS resolved,
      COALESCE(SUM(
        (CASE WHEN t.requires_reply THEN 1 ELSE 0 END) +
        (CASE WHEN t.requires_identification THEN 1 ELSE 0 END) +
        (CASE WHEN t.requires_editing THEN 1 ELSE 0 END) +
        (CASE WHEN t.requires_subscription_info THEN 1 ELSE 0 END) +
        (CASE WHEN t.requires_tracking_info THEN 1 ELSE 0 END)
      ), 0) AS req_sum
    FROM support_threads_data t
    WHERE t.created_at >= p_prev_date_from
      AND t.created_at < p_date_from
      AND (p_statuses IS NULL OR t.status = ANY(p_statuses))
      AND (p_request_types IS NULL OR t.request_type = ANY(p_request_types))
      AND (p_categories IS NULL OR t.request_subtype = ANY(p_categories))
      AND (p_versions IS NULL OR t.prompt_version = ANY(p_versions))
      AND (p_requirements IS NULL OR (
        (NOT 'requires_reply' = ANY(p_requirements) OR t.requires_reply = true) AND
        (NOT 'requires_identification' = ANY(p_requirements) OR t.requires_identification = true) AND
        (NOT 'requires_editing' = ANY(p_requirements) OR t.requires_editing = true) AND
        (NOT 'requires_subscription_info' = ANY(p_requirements) OR t.requires_subscription_info = true) AND
        (NOT 'requires_tracking_info' = ANY(p_requirements) OR t.requires_tracking_info = true)
      ))
  ),
  previous_versions AS (
    SELECT DISTINCT t.prompt_version
    FROM support_threads_data t
    WHERE t.created_at >= p_prev_date_from
      AND t.created_at < p_date_from
      AND t.prompt_version IS NOT NULL
      AND (p_statuses IS NULL OR t.status = ANY(p_statuses))
      AND (p_request_types IS NULL OR t.request_type = ANY(p_request_types))
      AND (p_categories IS NULL OR t.request_subtype = ANY(p_categories))
      AND (p_versions IS NULL OR t.prompt_version = ANY(p_versions))
      AND (p_requirements IS NULL OR (
        (NOT 'requires_reply' = ANY(p_requirements) OR t.requires_reply = true) AND
        (NOT 'requires_identification' = ANY(p_requirements) OR t.requires_identification = true) AND
        (NOT 'requires_editing' = ANY(p_requirements) OR t.requires_editing = true) AND
        (NOT 'requires_subscription_info' = ANY(p_requirements) OR t.requires_subscription_info = true) AND
        (NOT 'requires_tracking_info' = ANY(p_requirements) OR t.requires_tracking_info = true)
      ))
  ),
  previous_agent AS (
    SELECT COUNT(*) AS cnt
    FROM ai_human_comparison c
    WHERE c.prompt_version IN (SELECT prompt_version FROM previous_versions)
  )
  SELECT
    cp.total AS current_total,
    cp.req_reply AS current_requires_reply,
    cp.resolved AS current_resolved,
    cp.req_sum AS current_requirements_sum,
    ca.cnt AS current_agent_response_count,
    pp.total AS previous_total,
    pp.req_reply AS previous_requires_reply,
    pp.resolved AS previous_resolved,
    pp.req_sum AS previous_requirements_sum,
    pa.cnt AS previous_agent_response_count
  FROM current_period cp, current_agent ca, previous_period pp, previous_agent pa;
$$;

-- ===========================================
-- VERIFY: Test each function
-- ===========================================

-- Test status distribution (last 30 days)
-- SELECT * FROM get_support_status_distribution(NOW() - INTERVAL '30 days', NOW());

-- Test resolution time (last 90 days)
-- SELECT * FROM get_support_resolution_time(NOW() - INTERVAL '90 days', NOW());

-- Test sankey data (last 30 days)
-- SELECT * FROM get_support_sankey_data(NOW() - INTERVAL '30 days', NOW());

-- Test correlation matrix (last 30 days)
-- SELECT * FROM get_support_correlation_matrix(NOW() - INTERVAL '30 days', NOW());

-- Test KPIs (last 30 days with 30-day previous period)
-- SELECT * FROM get_support_kpis(NOW() - INTERVAL '30 days', NOW(), NOW() - INTERVAL '60 days');

-- ===========================================
-- QUICK FIX: If functions already exist without search_path,
-- run these ALTER commands instead of re-creating:
-- ===========================================
-- ALTER FUNCTION public.get_support_status_distribution SECURITY DEFINER SET search_path = public;
-- ALTER FUNCTION public.get_support_resolution_time SECURITY DEFINER SET search_path = public;
-- ALTER FUNCTION public.get_support_sankey_data SECURITY DEFINER SET search_path = public;
-- ALTER FUNCTION public.get_support_correlation_matrix SECURITY DEFINER SET search_path = public;
-- ALTER FUNCTION public.get_support_kpis SECURITY DEFINER SET search_path = public;
