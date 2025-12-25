-- Cleanup invalid request_subtype values
-- Only "Lev Haolam Subscription" should have subtypes
-- All other request_type should have request_subtype = NULL

-- First, check what we're about to change (DRY RUN)
-- Run this SELECT first to see affected records:

SELECT
  request_type,
  request_subtype,
  COUNT(*) as count
FROM support_threads_data
WHERE request_type != 'Lev Haolam Subscription'
  AND request_subtype IS NOT NULL
GROUP BY request_type, request_subtype
ORDER BY request_type, count DESC;

-- If the above looks correct, run the UPDATE:

-- UPDATE support_threads_data
-- SET request_subtype = NULL
-- WHERE request_type != 'Lev Haolam Subscription'
--   AND request_subtype IS NOT NULL;

-- Verify after update:
-- SELECT request_type, COUNT(*) as count
-- FROM support_threads_data
-- WHERE request_subtype IS NOT NULL
-- GROUP BY request_type;
