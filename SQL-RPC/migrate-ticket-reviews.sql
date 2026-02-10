-- ============================================================================
-- Migration: Move review fields from ai_human_comparison to ticket_reviews
-- ============================================================================
-- This migration creates a separate ticket_reviews table for qualified agent
-- feedback (review_status, ai_approved, reviewer_name, manual_comment,
-- requires_editing_correct, action_analysis_verification) and a VIEW that
-- LEFT JOINs it back for read queries.
--
-- Old columns on ai_human_comparison are NOT dropped yet.
-- After verifying the new code works, drop them in a separate migration.
-- ============================================================================

-- 1. Create table ticket_reviews
CREATE TABLE ticket_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comparison_id bigint NOT NULL REFERENCES ai_human_comparison(id) UNIQUE,
  review_status text DEFAULT 'unprocessed' CHECK (review_status IN ('processed', 'unprocessed')),
  ai_approved boolean DEFAULT NULL,
  reviewer_name text DEFAULT NULL,
  manual_comment text DEFAULT NULL,
  requires_editing_correct boolean DEFAULT NULL,
  action_analysis_verification jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_ticket_reviews_comparison_id ON ticket_reviews(comparison_id);
CREATE INDEX idx_ticket_reviews_status ON ticket_reviews(review_status);
CREATE INDEX idx_ticket_reviews_reviewer ON ticket_reviews(reviewer_name);
CREATE INDEX idx_ticket_reviews_ai_approved ON ticket_reviews(ai_approved);

-- 3. Migrate existing data (only rows with at least one review field filled)
INSERT INTO ticket_reviews (
  comparison_id,
  review_status,
  ai_approved,
  reviewer_name,
  manual_comment,
  requires_editing_correct,
  action_analysis_verification
)
SELECT
  id,
  COALESCE(review_status, 'unprocessed'),
  ai_approved,
  reviewer_name,
  manual_comment,
  requires_editing_correct,
  action_analysis_verification
FROM ai_human_comparison
WHERE review_status IS NOT NULL
   OR ai_approved IS NOT NULL
   OR reviewer_name IS NOT NULL
   OR manual_comment IS NOT NULL
   OR requires_editing_correct IS NOT NULL
   OR action_analysis_verification IS NOT NULL;

-- 4. VIEW for read queries (LEFT JOIN — rows without review get NULLs)
-- Columns prefixed with rv_ to avoid collisions with old columns on ai_human_comparison
CREATE OR REPLACE VIEW ai_comparison_with_reviews AS
SELECT
  c.*,
  r.review_status   AS rv_review_status,
  r.ai_approved     AS rv_ai_approved,
  r.reviewer_name   AS rv_reviewer_name,
  r.manual_comment   AS rv_manual_comment,
  r.requires_editing_correct AS rv_requires_editing_correct,
  r.action_analysis_verification AS rv_action_analysis_verification
FROM ai_human_comparison c
LEFT JOIN ticket_reviews r ON r.comparison_id = c.id;
