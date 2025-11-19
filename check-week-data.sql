-- Check all categories/versions for week 10.11.2025 - 16.11.2025
-- To see where changed numbers should differ between All Agents vs Qualified

SELECT
  request_subtype,
  prompt_version,
  COUNT(*) AS total_all_agents,
  COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com')) AS total_qualified,
  COUNT(*) FILTER (WHERE changed = true) AS changed_all_agents,
  COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com') AND changed = true) AS changed_qualified,
  -- Show difference to highlight where numbers differ
  COUNT(*) FILTER (WHERE changed = true) -
  COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com') AND changed = true) AS difference
FROM ai_human_comparison
WHERE created_at >= '2025-11-10T00:00:00Z'
  AND created_at <= '2025-11-16T23:59:59Z'
GROUP BY request_subtype, prompt_version
ORDER BY difference DESC, request_subtype, prompt_version;

-- If difference > 0, then non-qualified agents have changed=true records
-- This is where you should see different numbers when switching filters
