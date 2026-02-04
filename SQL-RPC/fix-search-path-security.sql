-- FIX: Function Search Path Mutable security warnings
-- This script adds SECURITY DEFINER SET search_path = public to all RPC functions
-- Execute this in Supabase SQL Editor
-- Generated: 2024-12-18 (based on actual function definitions from database)

-- ===========================================
-- 1. FIX get_filter_options
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_filter_options(
  p_from_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_to_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(versions text[], categories text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ARRAY(
      SELECT DISTINCT prompt_version
      FROM ai_human_comparison
      WHERE prompt_version IS NOT NULL
        AND (p_from_date IS NULL OR created_at >= p_from_date)
        AND (p_to_date IS NULL OR created_at < p_to_date)
      ORDER BY prompt_version
    ) AS versions,
    ARRAY(
      SELECT DISTINCT request_subtype
      FROM ai_human_comparison
      WHERE request_subtype IS NOT NULL
        AND (p_from_date IS NULL OR created_at >= p_from_date)
        AND (p_to_date IS NULL OR created_at < p_to_date)
      ORDER BY request_subtype
    ) AS categories;
END;
$function$;

-- ===========================================
-- 2. FIX get_category_distribution
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_category_distribution(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL::text[],
  p_categories text[] DEFAULT NULL::text[],
  p_agents text[] DEFAULT NULL::text[]
)
RETURNS TABLE(category text, total_records bigint, unchanged_records bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    request_subtype AS category,
    COUNT(*)::bigint AS total_records,
    -- unchanged_records only counts reviewed records (excluding context_shift)
    COUNT(*) FILTER (
      WHERE changed = false
      AND change_classification IS NOT NULL
      AND change_classification != 'context_shift'
    )::bigint AS unchanged_records
  FROM ai_human_comparison
  WHERE created_at >= p_from_date
    AND created_at < p_to_date
    AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    AND (p_categories IS NULL OR request_subtype = ANY(p_categories))
    AND (p_agents IS NULL OR email = ANY(p_agents))
  GROUP BY request_subtype
  ORDER BY total_records DESC;
END;
$function$;

-- ===========================================
-- 3. FIX get_tickets_stats
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_tickets_stats(days integer)
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT status, COUNT(*)
  FROM support_threads_data
  WHERE created_at >= NOW() - (days || ' days')::interval
  GROUP BY status
$function$;

-- ===========================================
-- 4. FIX update_updated_at_column (trigger function)
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- ===========================================
-- 5. FIX get_detailed_stats_paginated
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_detailed_stats_paginated(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL::text[],
  p_categories text[] DEFAULT NULL::text[],
  p_agents text[] DEFAULT NULL::text[],
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE(
  out_category text,
  out_version text,
  out_dates text,
  out_sort_order integer,
  out_total_records bigint,
  out_reviewed_records bigint,
  out_ai_errors bigint,
  out_ai_quality bigint,
  out_critical_errors bigint,
  out_meaningful_improvements bigint,
  out_stylistic_preferences bigint,
  out_no_significant_changes bigint,
  out_context_shifts bigint,
  out_total_count bigint,
  out_critical_fact_errors bigint,
  out_major_functional_omissions bigint,
  out_minor_info_gaps bigint,
  out_confusing_verbosity bigint,
  out_tonal_misalignments bigint,
  out_structural_fixes bigint,
  out_stylistic_edits bigint,
  out_perfect_matches bigint,
  out_excl_workflow_shifts bigint,
  out_excl_data_discrepancies bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total_count bigint;
BEGIN
  -- Return ALL results (no pagination - handled client-side)
  -- This ensures all categories are returned
  RETURN QUERY
  WITH filtered_data AS (
    SELECT request_subtype, prompt_version, created_at, email, changed, change_classification
    FROM ai_human_comparison
    WHERE created_at >= p_from_date AND created_at < p_to_date
      AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
      AND (p_categories IS NULL OR request_subtype = ANY(p_categories))
      AND (p_agents IS NULL OR email = ANY(p_agents))
  ),
  version_aggregations AS (
    SELECT
      request_subtype AS category,
      prompt_version AS version,
      NULL::text AS dates,
      NULL::timestamp with time zone AS week_start_date,
      1 AS sort_order,
      COUNT(*)::bigint AS total_records,
      -- Reviewed: legacy + new classifications
      COUNT(*) FILTER (WHERE change_classification IN (
        'critical_error', 'meaningful_improvement', 'stylistic_preference', 'no_significant_change', 'context_shift',
        'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT',
        'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH', 'EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'
      ))::bigint AS reviewed_records,
      -- AI Errors: legacy + new
      COUNT(*) FILTER (WHERE change_classification IN (
        'critical_error', 'meaningful_improvement',
        'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT'
      ))::bigint AS ai_errors,
      -- AI Quality: legacy + new
      COUNT(*) FILTER (WHERE change_classification IN (
        'no_significant_change', 'stylistic_preference',
        'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH'
      ))::bigint AS ai_quality,
      -- Legacy classifications (v3.x)
      COUNT(*) FILTER (WHERE change_classification = 'critical_error')::bigint AS critical_errors,
      COUNT(*) FILTER (WHERE change_classification = 'meaningful_improvement')::bigint AS meaningful_improvements,
      COUNT(*) FILTER (WHERE change_classification = 'stylistic_preference')::bigint AS stylistic_preferences,
      COUNT(*) FILTER (WHERE change_classification = 'no_significant_change')::bigint AS no_significant_changes,
      COUNT(*) FILTER (WHERE change_classification = 'context_shift')::bigint AS context_shifts,
      -- New classifications (v4.0)
      COUNT(*) FILTER (WHERE change_classification = 'CRITICAL_FACT_ERROR')::bigint AS critical_fact_errors,
      COUNT(*) FILTER (WHERE change_classification = 'MAJOR_FUNCTIONAL_OMISSION')::bigint AS major_functional_omissions,
      COUNT(*) FILTER (WHERE change_classification = 'MINOR_INFO_GAP')::bigint AS minor_info_gaps,
      COUNT(*) FILTER (WHERE change_classification = 'CONFUSING_VERBOSITY')::bigint AS confusing_verbosity,
      COUNT(*) FILTER (WHERE change_classification = 'TONAL_MISALIGNMENT')::bigint AS tonal_misalignments,
      COUNT(*) FILTER (WHERE change_classification = 'STRUCTURAL_FIX')::bigint AS structural_fixes,
      COUNT(*) FILTER (WHERE change_classification = 'STYLISTIC_EDIT')::bigint AS stylistic_edits,
      COUNT(*) FILTER (WHERE change_classification = 'PERFECT_MATCH')::bigint AS perfect_matches,
      COUNT(*) FILTER (WHERE change_classification = 'EXCL_WORKFLOW_SHIFT')::bigint AS excl_workflow_shifts,
      COUNT(*) FILTER (WHERE change_classification = 'EXCL_DATA_DISCREPANCY')::bigint AS excl_data_discrepancies
    FROM filtered_data
    GROUP BY request_subtype, prompt_version
  ),
  week_aggregations AS (
    SELECT
      request_subtype AS category,
      prompt_version AS version,
      TO_CHAR(DATE_TRUNC('week', created_at), 'DD.MM.YYYY') || ' — ' ||
      TO_CHAR(DATE_TRUNC('week', created_at) + INTERVAL '6 days', 'DD.MM.YYYY') AS dates,
      DATE_TRUNC('week', created_at) AS week_start_date,
      2 AS sort_order,
      COUNT(*)::bigint AS total_records,
      -- Reviewed: legacy + new classifications
      COUNT(*) FILTER (WHERE change_classification IN (
        'critical_error', 'meaningful_improvement', 'stylistic_preference', 'no_significant_change', 'context_shift',
        'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT',
        'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH', 'EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'
      ))::bigint AS reviewed_records,
      -- AI Errors: legacy + new
      COUNT(*) FILTER (WHERE change_classification IN (
        'critical_error', 'meaningful_improvement',
        'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT'
      ))::bigint AS ai_errors,
      -- AI Quality: legacy + new
      COUNT(*) FILTER (WHERE change_classification IN (
        'no_significant_change', 'stylistic_preference',
        'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH'
      ))::bigint AS ai_quality,
      -- Legacy classifications (v3.x)
      COUNT(*) FILTER (WHERE change_classification = 'critical_error')::bigint AS critical_errors,
      COUNT(*) FILTER (WHERE change_classification = 'meaningful_improvement')::bigint AS meaningful_improvements,
      COUNT(*) FILTER (WHERE change_classification = 'stylistic_preference')::bigint AS stylistic_preferences,
      COUNT(*) FILTER (WHERE change_classification = 'no_significant_change')::bigint AS no_significant_changes,
      COUNT(*) FILTER (WHERE change_classification = 'context_shift')::bigint AS context_shifts,
      -- New classifications (v4.0)
      COUNT(*) FILTER (WHERE change_classification = 'CRITICAL_FACT_ERROR')::bigint AS critical_fact_errors,
      COUNT(*) FILTER (WHERE change_classification = 'MAJOR_FUNCTIONAL_OMISSION')::bigint AS major_functional_omissions,
      COUNT(*) FILTER (WHERE change_classification = 'MINOR_INFO_GAP')::bigint AS minor_info_gaps,
      COUNT(*) FILTER (WHERE change_classification = 'CONFUSING_VERBOSITY')::bigint AS confusing_verbosity,
      COUNT(*) FILTER (WHERE change_classification = 'TONAL_MISALIGNMENT')::bigint AS tonal_misalignments,
      COUNT(*) FILTER (WHERE change_classification = 'STRUCTURAL_FIX')::bigint AS structural_fixes,
      COUNT(*) FILTER (WHERE change_classification = 'STYLISTIC_EDIT')::bigint AS stylistic_edits,
      COUNT(*) FILTER (WHERE change_classification = 'PERFECT_MATCH')::bigint AS perfect_matches,
      COUNT(*) FILTER (WHERE change_classification = 'EXCL_WORKFLOW_SHIFT')::bigint AS excl_workflow_shifts,
      COUNT(*) FILTER (WHERE change_classification = 'EXCL_DATA_DISCREPANCY')::bigint AS excl_data_discrepancies
    FROM filtered_data
    GROUP BY request_subtype, prompt_version, DATE_TRUNC('week', created_at)
  ),
  combined AS (
    SELECT * FROM version_aggregations
    UNION ALL
    SELECT * FROM week_aggregations
  ),
  total AS (
    SELECT COUNT(*)::bigint AS cnt FROM combined
  )
  SELECT
    c.category AS out_category,
    c.version AS out_version,
    c.dates AS out_dates,
    c.sort_order AS out_sort_order,
    c.total_records AS out_total_records,
    c.reviewed_records AS out_reviewed_records,
    c.ai_errors AS out_ai_errors,
    c.ai_quality AS out_ai_quality,
    c.critical_errors AS out_critical_errors,
    c.meaningful_improvements AS out_meaningful_improvements,
    c.stylistic_preferences AS out_stylistic_preferences,
    c.no_significant_changes AS out_no_significant_changes,
    c.context_shifts AS out_context_shifts,
    t.cnt AS out_total_count,
    -- New classification outputs
    c.critical_fact_errors AS out_critical_fact_errors,
    c.major_functional_omissions AS out_major_functional_omissions,
    c.minor_info_gaps AS out_minor_info_gaps,
    c.confusing_verbosity AS out_confusing_verbosity,
    c.tonal_misalignments AS out_tonal_misalignments,
    c.structural_fixes AS out_structural_fixes,
    c.stylistic_edits AS out_stylistic_edits,
    c.perfect_matches AS out_perfect_matches,
    c.excl_workflow_shifts AS out_excl_workflow_shifts,
    c.excl_data_discrepancies AS out_excl_data_discrepancies
  FROM combined c
  CROSS JOIN total t
  ORDER BY
    c.category,
    CAST(SUBSTRING(c.version FROM '[0-9]+') AS INTEGER) DESC,
    c.sort_order,
    c.week_start_date DESC NULLS FIRST;
END;
$function$;

-- ===========================================
-- 6. FIX get_min_created_date
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_min_created_date()
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  min_date timestamp WITH time zone;
BEGIN
  SELECT MIN(created_at) INTO min_date
  FROM public.ai_human_comparison;

  -- Return a default date if no records exist
  IF min_date IS NULL THEN
    RETURN '2020-01-01 00:00:00+00'::timestamp WITH time zone;
  END IF;

  RETURN min_date;
END;
$function$;

-- ===========================================
-- 7. FIX get_request_category_stats
-- ===========================================
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
    WHERE std.thread_date >= date_from AND std.thread_date < date_to
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
  ORDER BY cs.category_count DESC;
END;
$function$;

-- ===========================================
-- 8. FIX get_support_aggregated_stats
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_support_aggregated_stats(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_statuses text[] DEFAULT NULL::text[],
  p_request_types text[] DEFAULT NULL::text[],
  p_versions text[] DEFAULT NULL::text[],
  p_requirements text[] DEFAULT NULL::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result jsonb;
  v_current_data jsonb;
  v_previous_data jsonb;
  v_previous_from timestamp WITH time zone;
  v_days_diff integer;
BEGIN
  -- Calculate previous period
  v_days_diff := CEIL(EXTRACT(EPOCH FROM (p_to_date - p_from_date)) / 86400);
  v_previous_from := p_from_date - (v_days_diff || ' days')::interval;

  -- Fetch current period aggregated stats (simplified - no complex aggregations)
  SELECT jsonb_build_object(
    'total_threads', (
      SELECT COUNT(*)
      FROM support_threads_data
      WHERE created_at >= p_from_date
        AND created_at < p_to_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    ),
    'threads_with_draft', (
      SELECT COUNT(*)
      FROM support_threads_data
      WHERE created_at >= p_from_date
        AND created_at < p_to_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
        AND ai_draft_reply IS NOT NULL
        AND ai_draft_reply != ''
    ),
    'threads_requiring_reply', (
      SELECT COUNT(*)
      FROM support_threads_data
      WHERE created_at >= p_from_date
        AND created_at < p_to_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
        AND requires_reply = true
    ),
    'threads_resolved', (
      SELECT COUNT(*)
      FROM support_threads_data
      WHERE created_at >= p_from_date
        AND created_at < p_to_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
        AND status = 'Reply is ready'
    ),
    'avg_requirements', (
      SELECT COALESCE(AVG(
        (CASE WHEN requires_reply THEN 1 ELSE 0 END) +
        (CASE WHEN requires_identification THEN 1 ELSE 0 END) +
        (CASE WHEN requires_editing THEN 1 ELSE 0 END) +
        (CASE WHEN requires_subscription_info THEN 1 ELSE 0 END) +
        (CASE WHEN requires_tracking_info THEN 1 ELSE 0 END) +
        (CASE WHEN requires_box_contents_info THEN 1 ELSE 0 END)
      ), 0)
      FROM support_threads_data
      WHERE created_at >= p_from_date
        AND created_at < p_to_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    )
  ) INTO v_current_data;

  -- Fetch previous period aggregated stats
  SELECT jsonb_build_object(
    'total_threads', (
      SELECT COUNT(*)
      FROM support_threads_data
      WHERE created_at >= v_previous_from
        AND created_at < p_from_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    ),
    'threads_with_draft', (
      SELECT COUNT(*)
      FROM support_threads_data
      WHERE created_at >= v_previous_from
        AND created_at < p_from_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
        AND ai_draft_reply IS NOT NULL
        AND ai_draft_reply != ''
    ),
    'threads_requiring_reply', (
      SELECT COUNT(*)
      FROM support_threads_data
      WHERE created_at >= v_previous_from
        AND created_at < p_from_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
        AND requires_reply = true
    ),
    'threads_resolved', (
      SELECT COUNT(*)
      FROM support_threads_data
      WHERE created_at >= v_previous_from
        AND created_at < p_from_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
        AND status = 'Reply is ready'
    ),
    'avg_requirements', (
      SELECT COALESCE(AVG(
        (CASE WHEN requires_reply THEN 1 ELSE 0 END) +
        (CASE WHEN requires_identification THEN 1 ELSE 0 END) +
        (CASE WHEN requires_editing THEN 1 ELSE 0 END) +
        (CASE WHEN requires_subscription_info THEN 1 ELSE 0 END) +
        (CASE WHEN requires_tracking_info THEN 1 ELSE 0 END) +
        (CASE WHEN requires_box_contents_info THEN 1 ELSE 0 END)
      ), 0)
      FROM support_threads_data
      WHERE created_at >= v_previous_from
        AND created_at < p_from_date
        AND (p_statuses IS NULL OR status = ANY(p_statuses))
        AND (p_request_types IS NULL OR request_type = ANY(p_request_types))
        AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    )
  ) INTO v_previous_data;

  -- Combine current and previous data
  v_result := jsonb_build_object(
    'current', v_current_data,
    'previous', v_previous_data
  );

  RETURN v_result;
END;
$function$;

-- ===========================================
-- 9. FIX get_support_threads_paginated
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_support_threads_paginated(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_statuses text[] DEFAULT NULL::text[],
  p_request_types text[] DEFAULT NULL::text[],
  p_versions text[] DEFAULT NULL::text[],
  p_requirements text[] DEFAULT NULL::text[],
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE(
  thread_id text,
  ticket_id text,
  status text,
  request_type text,
  prompt_version text,
  created_at timestamp with time zone,
  requires_reply boolean,
  requires_identification boolean,
  requires_editing boolean,
  requires_subscription_info boolean,
  requires_tracking_info boolean,
  requires_box_contents_info boolean,
  has_ai_draft boolean,
  quality_percentage integer,
  reviewed_by text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total_count bigint;
  v_offset integer;
BEGIN
  v_offset := p_page * p_page_size;

  -- Calculate total count first (FIXED: добавлен алиас s)
  SELECT COUNT(*) INTO v_total_count
  FROM support_threads_data s
  WHERE s.created_at >= p_from_date
    AND s.created_at < p_to_date
    AND (p_statuses IS NULL OR s.status = ANY(p_statuses))
    AND (p_request_types IS NULL OR s.request_type = ANY(p_request_types))
    AND (p_versions IS NULL OR s.prompt_version = ANY(p_versions));

  -- Return paginated results with quality metrics from JOIN
  RETURN QUERY
  SELECT
    s.thread_id::text,
    s.ticket_id::text,
    s.status::text,
    s.request_type::text,
    s.prompt_version::text,
    s.created_at,
    s.requires_reply,
    s.requires_identification,
    s.requires_editing,
    s.requires_subscription_info,
    s.requires_tracking_info,
    s.requires_box_contents_info,
    (s.ai_draft_reply IS NOT NULL AND s.ai_draft_reply != '') as has_ai_draft,
    -- Quality from ai_human_comparison JOIN
    CASE
      WHEN COUNT(ahc.id) FILTER (WHERE ahc.email = ANY(ARRAY[
        'marianna@levhaolam.com',
        'laure@levhaolam.com',
        'matea@levhaolam.com',
        'yakov@levhaolam.com'
      ])) > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE ahc.changed = false AND ahc.email = ANY(ARRAY[
            'marianna@levhaolam.com',
            'laure@levhaolam.com',
            'matea@levhaolam.com',
            'yakov@levhaolam.com'
          ])) * 100.0 /
          NULLIF(COUNT(*) FILTER (WHERE ahc.email = ANY(ARRAY[
            'marianna@levhaolam.com',
            'laure@levhaolam.com',
            'matea@levhaolam.com',
            'yakov@levhaolam.com'
          ])), 0))
        )::integer
      ELSE NULL
    END as quality_percentage,
    STRING_AGG(DISTINCT ahc.email, ', ') FILTER (WHERE ahc.email = ANY(ARRAY[
      'marianna@levhaolam.com',
      'laure@levhaolam.com',
      'matea@levhaolam.com',
      'yakov@levhaolam.com'
    ])) as reviewed_by,
    v_total_count as total_count
  FROM support_threads_data s
  LEFT JOIN ai_human_comparison ahc ON s.prompt_version = ahc.prompt_version
  WHERE s.created_at >= p_from_date
    AND s.created_at < p_to_date
    AND (p_statuses IS NULL OR s.status = ANY(p_statuses))
    AND (p_request_types IS NULL OR s.request_type = ANY(p_request_types))
    AND (p_versions IS NULL OR s.prompt_version = ANY(p_versions))
  GROUP BY s.thread_id, s.ticket_id, s.status, s.request_type, s.prompt_version,
           s.created_at, s.requires_reply, s.requires_identification, s.requires_editing,
           s.requires_subscription_info, s.requires_tracking_info, s.requires_box_contents_info,
           s.ai_draft_reply
  ORDER BY s.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;

-- ===========================================
-- 10. FIX get_kpi_stats
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_kpi_stats(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL::text[],
  p_categories text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  total_records bigint,
  reviewed_records bigint,
  context_shift_records bigint,
  unchanged_records bigint,
  changed_records bigint,
  compared_records bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_records,
    COUNT(*) FILTER (WHERE change_classification IS NOT NULL)::bigint AS reviewed_records,
    COUNT(*) FILTER (WHERE change_classification IN ('context_shift', 'EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'))::bigint AS context_shift_records,
    COUNT(*) FILTER (WHERE change_classification IN ('no_significant_change', 'stylistic_preference', 'STRUCTURAL_FIX', 'STYLISTIC_EDIT', 'PERFECT_MATCH'))::bigint AS unchanged_records,
    COUNT(*) FILTER (WHERE change_classification IN ('critical_error', 'meaningful_improvement', 'CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION', 'MINOR_INFO_GAP', 'CONFUSING_VERBOSITY', 'TONAL_MISALIGNMENT'))::bigint AS changed_records,
    COUNT(*) FILTER (WHERE status = 'compared' AND change_classification IS NOT NULL AND change_classification NOT IN ('context_shift', 'EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'))::bigint AS compared_records
  FROM ai_human_comparison
  WHERE created_at >= p_from_date
    AND created_at < p_to_date
    AND (p_versions IS NULL OR prompt_version = ANY(p_versions))
    AND (p_categories IS NULL OR request_subtype = ANY(p_categories));
END;
$function$;

-- ===========================================
-- DONE! Verify the changes
-- ===========================================
-- Run this to verify all functions now have search_path set:
SELECT
  p.proname AS function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ FIXED'
    ELSE '❌ NOT FIXED'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_filter_options',
    'get_category_distribution',
    'get_tickets_stats',
    'update_updated_at_column',
    'get_detailed_stats_paginated',
    'get_min_created_date',
    'get_request_category_stats',
    'get_support_aggregated_stats',
    'get_support_threads_paginated',
    'get_kpi_stats'
  )
ORDER BY p.proname;
