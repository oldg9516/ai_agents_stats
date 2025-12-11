-- Migration: Add review status and AI approval fields to ai_human_comparison
-- Date: 2025-01-20
-- Description: Adds review_status and ai_approved columns for ticket review workflow

-- Add review_status column
ALTER TABLE ai_human_comparison
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'unprocessed';

-- Add CHECK constraint for review_status
ALTER TABLE ai_human_comparison
ADD CONSTRAINT review_status_check
CHECK (review_status IN ('processed', 'unprocessed'));

-- Add ai_approved column
ALTER TABLE ai_human_comparison
ADD COLUMN IF NOT EXISTS ai_approved BOOLEAN DEFAULT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN ai_human_comparison.review_status IS 'Review status: processed or unprocessed';
COMMENT ON COLUMN ai_human_comparison.ai_approved IS 'Whether the AI answer was approved by the reviewer';

-- Create index for filtering by review_status
CREATE INDEX IF NOT EXISTS idx_ai_human_comparison_review_status
ON ai_human_comparison(review_status);

-- Create index for filtering by ai_approved
CREATE INDEX IF NOT EXISTS idx_ai_human_comparison_ai_approved
ON ai_human_comparison(ai_approved);
