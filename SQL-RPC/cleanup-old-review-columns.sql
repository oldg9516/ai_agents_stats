-- ============================================================================
-- Cleanup Migration: Drop old review columns from ai_human_comparison
-- ============================================================================
-- Prerequisites:
--   1. ticket_reviews table exists and has all migrated data
--   2. Code has been verified working with the VIEW approach
--   3. Drop duplicate index and old review indexes
--
-- After running this SQL, deploy the code changes that remove rv_ prefixes.
-- ============================================================================

-- 1. Drop duplicate index
DROP INDEX IF EXISTS idx_ai_human_comparison_subtype;

-- 2. Drop old review indexes (data now lives in ticket_reviews)
DROP INDEX IF EXISTS idx_ai_human_comparison_ai_approved;
DROP INDEX IF EXISTS idx_ai_human_comparison_review_status;

-- 3. Drop the VIEW first (it depends on columns we're about to drop via c.*)
DROP VIEW IF EXISTS ai_comparison_with_reviews;

-- 4. Drop old review columns from ai_human_comparison
ALTER TABLE ai_human_comparison
  DROP COLUMN IF EXISTS review_status,
  DROP COLUMN IF EXISTS ai_approved,
  DROP COLUMN IF EXISTS reviewer_name,
  DROP COLUMN IF EXISTS manual_comment,
  DROP COLUMN IF EXISTS requires_editing_correct,
  DROP COLUMN IF EXISTS action_analysis_verification;

-- 5. Recreate VIEW without rv_ prefixes (no naming collisions anymore)
CREATE OR REPLACE VIEW ai_comparison_with_reviews AS
SELECT
  c.*,
  r.review_status,
  r.ai_approved,
  r.reviewer_name,
  r.manual_comment,
  r.requires_editing_correct,
  r.action_analysis_verification
FROM ai_human_comparison c
LEFT JOIN ticket_reviews r ON r.comparison_id = c.id;
