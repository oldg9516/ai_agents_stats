-- Subcategories Statistics RPC Function
-- Replaces N+1 JS queries with a single JOIN + GROUP BY
-- Execute in Supabase SQL Editor
--
-- Usage:
--   SELECT * FROM get_subcategories_stats(
--     NOW() - INTERVAL '30 days',
--     NOW(),
--     ARRAY['marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com']
--   );

CREATE OR REPLACE FUNCTION public.get_subcategories_stats(
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_qualified_agents text[],
  p_versions text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL
)
RETURNS TABLE(
  category text,
  subcategory text,
  total bigint,
  changed bigint,
  unchanged bigint,
  quality_percentage numeric,
  critical_error bigint,
  meaningful_improvement bigint,
  stylistic_preference bigint,
  no_significant_change bigint,
  context_shift bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH comparison_data AS (
    SELECT
      t.request_subtype,
      t.request_sub_subtype,
      c.changed,
      c.change_classification
    FROM support_threads_data t
    INNER JOIN ai_human_comparison c
      ON c.thread_id = t.thread_id
    WHERE t.thread_date >= p_date_from
      AND t.thread_date < p_date_to
      AND t.request_subtype IS NOT NULL
      AND t.request_sub_subtype IS NOT NULL
      AND t.request_subtype NOT LIKE '%,%'
      AND c.email = ANY(p_qualified_agents)
      AND c.email != 'api@levhaolam.com'
      AND c.change_classification IS NOT NULL
      AND (p_versions IS NULL OR c.prompt_version = ANY(p_versions))
      AND (p_agents IS NULL OR c.email = ANY(p_agents))
  ),
  aggregated AS (
    SELECT
      d.request_subtype AS cat,
      d.request_sub_subtype AS subcat,
      COUNT(*) AS total,
      COUNT(*) FILTER (
        WHERE d.changed = true AND d.change_classification != 'context_shift'
      ) AS changed_cnt,
      COUNT(*) FILTER (
        WHERE d.changed = false AND d.change_classification != 'context_shift'
      ) AS unchanged_cnt,
      COUNT(*) FILTER (WHERE d.change_classification = 'critical_error') AS critical_error_cnt,
      COUNT(*) FILTER (WHERE d.change_classification = 'meaningful_improvement') AS meaningful_improvement_cnt,
      COUNT(*) FILTER (WHERE d.change_classification = 'stylistic_preference') AS stylistic_preference_cnt,
      COUNT(*) FILTER (WHERE d.change_classification = 'no_significant_change') AS no_significant_change_cnt,
      COUNT(*) FILTER (WHERE d.change_classification = 'context_shift') AS context_shift_cnt
    FROM comparison_data d
    GROUP BY d.request_subtype, d.request_sub_subtype
  )
  SELECT
    a.cat AS category,
    a.subcat AS subcategory,
    a.total,
    a.changed_cnt AS changed,
    a.unchanged_cnt AS unchanged,
    CASE
      WHEN (a.changed_cnt + a.unchanged_cnt) > 0
      THEN ROUND(a.unchanged_cnt * 100.0 / (a.changed_cnt + a.unchanged_cnt), 0)
      ELSE 0
    END AS quality_percentage,
    a.critical_error_cnt AS critical_error,
    a.meaningful_improvement_cnt AS meaningful_improvement,
    a.stylistic_preference_cnt AS stylistic_preference,
    a.no_significant_change_cnt AS no_significant_change,
    a.context_shift_cnt AS context_shift
  FROM aggregated a
  ORDER BY a.total DESC;
$$;
