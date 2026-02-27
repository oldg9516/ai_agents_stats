-- name: quality_score_by_category
-- question: What is the average quality score by request category?
-- note: Uses ai_comparison_with_reviews VIEW for ai_approved (lives in ticket_reviews)
SELECT
  a.request_subtype AS category,
  COUNT(*) AS total_records,
  ROUND(AVG(
    CASE a.change_classification
      WHEN 'PERFECT_MATCH' THEN 100
      WHEN 'STYLISTIC_EDIT' THEN 98
      WHEN 'STRUCTURAL_FIX' THEN 95
      WHEN 'TONAL_MISALIGNMENT' THEN 90
      WHEN 'CONFUSING_VERBOSITY' THEN 85
      WHEN 'MINOR_INFO_GAP' THEN 80
      WHEN 'MAJOR_FUNCTIONAL_OMISSION' THEN 50
      WHEN 'CRITICAL_FACT_ERROR' THEN 0
    END
  ), 1) AS avg_quality_score,
  ROUND(100.0 * COUNT(*) FILTER (WHERE a.ai_approved = true) / NULLIF(COUNT(*), 0), 1) AS approval_rate_pct
FROM ai_comparison_with_reviews a
WHERE a.change_classification IS NOT NULL
  AND a.change_classification NOT LIKE 'EXCL_%'
  AND a.change_classification != 'HUMAN_INCOMPLETE'
GROUP BY a.request_subtype
ORDER BY avg_quality_score DESC
LIMIT 50;

-- name: daily_quality_trend
-- question: Show quality score trend for the last 30 days
SELECT
  DATE(created_at AT TIME ZONE 'Asia/Jerusalem') AS day,
  COUNT(*) AS records,
  ROUND(AVG(
    CASE change_classification
      WHEN 'PERFECT_MATCH' THEN 100
      WHEN 'STYLISTIC_EDIT' THEN 98
      WHEN 'STRUCTURAL_FIX' THEN 95
      WHEN 'TONAL_MISALIGNMENT' THEN 90
      WHEN 'CONFUSING_VERBOSITY' THEN 85
      WHEN 'MINOR_INFO_GAP' THEN 80
      WHEN 'MAJOR_FUNCTIONAL_OMISSION' THEN 50
      WHEN 'CRITICAL_FACT_ERROR' THEN 0
    END
  ), 1) AS avg_quality_score
FROM ai_human_comparison
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND change_classification IS NOT NULL
  AND change_classification NOT LIKE 'EXCL_%'
  AND change_classification != 'HUMAN_INCOMPLETE'
GROUP BY day
ORDER BY day
LIMIT 50;

-- name: classification_distribution
-- question: What is the distribution of change classifications?
SELECT
  change_classification,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER(), 0), 1) AS percentage
FROM ai_human_comparison
WHERE change_classification IS NOT NULL
GROUP BY change_classification
ORDER BY count DESC
LIMIT 50;

-- name: reviewer_performance
-- question: Show reviewer performance statistics
-- note: Uses ai_comparison_with_reviews VIEW for ai_approved (lives in ticket_reviews)
SELECT
  a.email AS reviewer,
  COUNT(*) AS total_reviews,
  ROUND(100.0 * COUNT(*) FILTER (WHERE a.ai_approved = true) / NULLIF(COUNT(*), 0), 1) AS approval_rate_pct,
  ROUND(AVG(
    CASE a.change_classification
      WHEN 'PERFECT_MATCH' THEN 100
      WHEN 'STYLISTIC_EDIT' THEN 98
      WHEN 'STRUCTURAL_FIX' THEN 95
      WHEN 'TONAL_MISALIGNMENT' THEN 90
      WHEN 'CONFUSING_VERBOSITY' THEN 85
      WHEN 'MINOR_INFO_GAP' THEN 80
      WHEN 'MAJOR_FUNCTIONAL_OMISSION' THEN 50
      WHEN 'CRITICAL_FACT_ERROR' THEN 0
    END
  ), 1) AS avg_quality_score
FROM ai_comparison_with_reviews a
WHERE a.change_classification IS NOT NULL
  AND a.change_classification NOT LIKE 'EXCL_%'
  AND a.change_classification != 'HUMAN_INCOMPLETE'
GROUP BY a.email
ORDER BY total_reviews DESC
LIMIT 50;

-- name: ticket_review_status
-- question: How many ticket reviews are processed vs unprocessed?
SELECT
  review_status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER(), 0), 1) AS percentage
FROM ticket_reviews
GROUP BY review_status
ORDER BY count DESC;

-- name: quality_by_prompt_version
-- question: Compare quality scores across prompt versions
-- note: Uses ai_comparison_with_reviews VIEW for ai_approved (lives in ticket_reviews)
SELECT
  a.prompt_version,
  COUNT(*) AS total_records,
  ROUND(AVG(
    CASE a.change_classification
      WHEN 'PERFECT_MATCH' THEN 100
      WHEN 'STYLISTIC_EDIT' THEN 98
      WHEN 'STRUCTURAL_FIX' THEN 95
      WHEN 'TONAL_MISALIGNMENT' THEN 90
      WHEN 'CONFUSING_VERBOSITY' THEN 85
      WHEN 'MINOR_INFO_GAP' THEN 80
      WHEN 'MAJOR_FUNCTIONAL_OMISSION' THEN 50
      WHEN 'CRITICAL_FACT_ERROR' THEN 0
    END
  ), 1) AS avg_quality_score,
  ROUND(100.0 * COUNT(*) FILTER (WHERE a.ai_approved = true) / NULLIF(COUNT(*), 0), 1) AS approval_rate_pct
FROM ai_comparison_with_reviews a
WHERE a.change_classification IS NOT NULL
  AND a.change_classification NOT LIKE 'EXCL_%'
  AND a.change_classification != 'HUMAN_INCOMPLETE'
GROUP BY a.prompt_version
ORDER BY avg_quality_score DESC
LIMIT 50;
