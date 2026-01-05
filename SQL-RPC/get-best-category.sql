-- SQL function for Best Category calculation
-- This avoids the 1000 row limit by aggregating on the database side
-- Excludes system/API emails (api@levhaolam.com) from statistics
-- Returns the category with highest quality percentage
--
-- Quality = good quality records / (reviewed records - context_shift records)

DROP FUNCTION IF EXISTS get_best_category(timestamp with time zone, timestamp with time zone, text[], text[], text[], text);

CREATE OR REPLACE FUNCTION get_best_category(
  p_from_date timestamp with time zone,
  p_to_date timestamp with time zone,
  p_versions text[] DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL,
  p_date_field text DEFAULT 'created_at'
)
RETURNS TABLE (
  category text,
  total_evaluable bigint,
  quality_records bigint,
  quality_percentage numeric
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate p_date_field to prevent SQL injection
  IF p_date_field NOT IN ('created_at', 'human_reply_date') THEN
    p_date_field := 'created_at';
  END IF;

  RETURN QUERY EXECUTE format('
    WITH category_stats AS (
      SELECT
        request_subtype AS cat,
        -- total_evaluable: reviewed records excluding context_shift
        COUNT(*) FILTER (
          WHERE change_classification IS NOT NULL
            AND change_classification != ''context_shift''
        ) AS evaluable,
        -- quality_records: good quality classifications
        COUNT(*) FILTER (
          WHERE change_classification IN (
            ''PERFECT_MATCH'',
            ''STRUCTURAL_FIX'',
            ''STYLISTIC_EDIT'',
            ''no_significant_change'',
            ''stylistic_preference''
          )
        ) AS quality
      FROM ai_human_comparison
      WHERE %I >= $1
        AND %I <= $2
        AND ($3 IS NULL OR prompt_version = ANY($3))
        AND ($4 IS NULL OR request_subtype = ANY($4))
        AND ($5 IS NULL OR email = ANY($5))
        AND (email IS NULL OR email != ''api@levhaolam.com'')
        %s
      GROUP BY request_subtype
      HAVING COUNT(*) FILTER (
        WHERE change_classification IS NOT NULL
          AND change_classification != ''context_shift''
      ) > 0
    )
    SELECT
      cat AS category,
      evaluable AS total_evaluable,
      quality AS quality_records,
      ROUND((quality::numeric / evaluable::numeric) * 100, 2) AS quality_percentage
    FROM category_stats
    ORDER BY quality_percentage DESC
    LIMIT 1
  ',
    p_date_field,
    p_date_field,
    CASE WHEN p_date_field = 'human_reply_date' THEN 'AND human_reply_date IS NOT NULL' ELSE '' END
  )
  USING p_from_date, p_to_date, p_versions, p_categories, p_agents;
END;
$$;

COMMENT ON FUNCTION get_best_category IS 'Returns the category with highest quality percentage. Quality = good quality records / evaluable records (reviewed - context_shift). Excludes system/API emails (api@levhaolam.com). Supports dynamic date field (created_at or human_reply_date).';
