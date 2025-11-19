-- Test query to check Changed column logic
-- Using real category: customization_request v1
-- Date range: 10.11.2025 - 16.11.2025

-- Scenario 1: All Agents filter (p_agents IS NULL)
SELECT
  'All Agents' AS filter_type,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com')) AS qualified_agents,
  COUNT(*) FILTER (WHERE changed = true) AS changed_all_agents,
  COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com') AND changed = true) AS changed_qualified_only
FROM ai_human_comparison
WHERE request_subtype = 'customization_request'
  AND prompt_version = 'v1'
  AND created_at >= '2025-11-10T00:00:00Z'
  AND created_at <= '2025-11-16T23:59:59Z'

UNION ALL

-- Scenario 2: Qualified Agents filter (p_agents = qualified list)
SELECT
  'Qualified Agents' AS filter_type,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com')) AS qualified_agents,
  COUNT(*) FILTER (WHERE changed = true) AS changed_all_agents,
  COUNT(*) FILTER (WHERE email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com') AND changed = true) AS changed_qualified_only
FROM ai_human_comparison
WHERE request_subtype = 'customization_request'
  AND prompt_version = 'v1'
  AND created_at >= '2025-11-10T00:00:00Z'
  AND created_at <= '2025-11-16T23:59:59Z'
  AND email IN ('marianna@levhaolam.com', 'laure@levhaolam.com', 'sofia@levhaolam.com');

-- This should match the week 10.11.2025 — 16.11.2025 from your screenshot
