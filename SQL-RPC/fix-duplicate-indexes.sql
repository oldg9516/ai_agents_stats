-- FIX: Duplicate Indexes warning from Supabase Security Advisor
-- Execute in Supabase SQL Editor
-- Generated: 2024-12-18

-- ===========================================
-- 1. CHECK FOR DUPLICATE INDEXES
-- ===========================================
-- Run this query to see all duplicate indexes:

SELECT
    pg_size_pretty(sum(pg_relation_size(idx))::bigint) as size,
    (array_agg(idx))[1] as idx1,
    (array_agg(idx))[2] as idx2,
    (array_agg(idx))[3] as idx3,
    (array_agg(idx))[4] as idx4,
    (array_agg(pg_get_indexdef(idx)))[1] as definition
FROM (
    SELECT
        indexrelid::regclass as idx,
        (indrelid::text || E'\n' || indclass::text || E'\n' || indkey::text || E'\n' ||
         coalesce(indexprs::text,'') || E'\n' || coalesce(indpred::text,'')) as key
    FROM pg_index
    WHERE indrelid::regclass::text NOT LIKE 'pg_%'
) sub
GROUP BY key HAVING count(*)>1
ORDER BY sum(pg_relation_size(idx)) DESC;

-- ===========================================
-- 2. DROP DUPLICATE INDEXES
-- Based on Security Advisor warnings:
-- - public.support_tickets
-- - public.support_tickets_duplicate
-- ===========================================

-- First, check what these indexes look like:
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename LIKE 'support_tickets%'
ORDER BY indexname;

-- Drop the duplicate index (keep the original)
-- UNCOMMENT the line below after verifying which index to drop:
-- DROP INDEX IF EXISTS support_tickets_duplicate;

-- ===========================================
-- 3. RECOMMENDED INDEXES FOR PERFORMANCE
-- Based on actual SQL function queries analysis
-- ===========================================

-- =====================
-- support_threads_data indexes
-- Used by: get_tickets_stats, get_request_category_stats,
--          get_support_aggregated_stats, get_support_threads_paginated
-- =====================

CREATE INDEX IF NOT EXISTS idx_support_threads_created_at
ON support_threads_data(created_at DESC);

-- thread_date is used in get_request_category_stats
CREATE INDEX IF NOT EXISTS idx_support_threads_thread_date
ON support_threads_data(thread_date DESC);

CREATE INDEX IF NOT EXISTS idx_support_threads_status
ON support_threads_data(status);

CREATE INDEX IF NOT EXISTS idx_support_threads_request_type
ON support_threads_data(request_type);

CREATE INDEX IF NOT EXISTS idx_support_threads_ticket_id
ON support_threads_data(ticket_id);

-- NOTE: thread_id is PRIMARY KEY, no separate index needed

CREATE INDEX IF NOT EXISTS idx_support_threads_prompt_version
ON support_threads_data(prompt_version);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_support_threads_date_status
ON support_threads_data(created_at DESC, status);

-- For get_support_aggregated_stats and get_support_threads_paginated filters
CREATE INDEX IF NOT EXISTS idx_support_threads_date_status_type
ON support_threads_data(created_at DESC, status, request_type);

-- =====================
-- ai_human_comparison indexes
-- Used by: get_filter_options, get_category_distribution,
--          get_detailed_stats_paginated, get_kpi_stats, get_request_category_stats
-- =====================

CREATE INDEX IF NOT EXISTS idx_ai_comparison_created_at
ON ai_human_comparison(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_comparison_thread_id
ON ai_human_comparison(thread_id);

CREATE INDEX IF NOT EXISTS idx_ai_comparison_prompt_version
ON ai_human_comparison(prompt_version);

CREATE INDEX IF NOT EXISTS idx_ai_comparison_request_subtype
ON ai_human_comparison(request_subtype);

CREATE INDEX IF NOT EXISTS idx_ai_comparison_email
ON ai_human_comparison(email);

CREATE INDEX IF NOT EXISTS idx_ai_comparison_classification
ON ai_human_comparison(change_classification);

-- status field is used in get_request_category_stats and get_kpi_stats
CREATE INDEX IF NOT EXISTS idx_ai_comparison_status
ON ai_human_comparison(status);

-- changed field is used in get_category_distribution
CREATE INDEX IF NOT EXISTS idx_ai_comparison_changed
ON ai_human_comparison(changed);

-- human_reply_date is used in get_request_category_stats for response time calc
CREATE INDEX IF NOT EXISTS idx_ai_comparison_human_reply_date
ON ai_human_comparison(human_reply_date);

-- Composite indexes for date range + filters (most common query patterns)
CREATE INDEX IF NOT EXISTS idx_ai_comparison_date_version
ON ai_human_comparison(created_at DESC, prompt_version);

CREATE INDEX IF NOT EXISTS idx_ai_comparison_date_category
ON ai_human_comparison(created_at DESC, request_subtype);

-- For get_kpi_stats: date + version + category
CREATE INDEX IF NOT EXISTS idx_ai_comparison_date_version_category
ON ai_human_comparison(created_at DESC, prompt_version, request_subtype);

-- For get_request_category_stats: status + date + classification
CREATE INDEX IF NOT EXISTS idx_ai_comparison_status_date_class
ON ai_human_comparison(status, created_at DESC, change_classification);

-- =====================
-- support_dialogs indexes
-- Used in fetchHumanResponsesInBatches and fetchSupportThreads JOINs
-- =====================

CREATE INDEX IF NOT EXISTS idx_support_dialogs_thread_id
ON support_dialogs(thread_id);

CREATE INDEX IF NOT EXISTS idx_support_dialogs_ticket_id
ON support_dialogs(ticket_id);

CREATE INDEX IF NOT EXISTS idx_support_dialogs_direction
ON support_dialogs(direction);

-- Composite for checking outgoing messages after AI thread
CREATE INDEX IF NOT EXISTS idx_support_dialogs_ticket_direction
ON support_dialogs(ticket_id, direction);

-- ===========================================
-- 4. VERIFY INDEXES CREATED
-- ===========================================
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_class ON indexrelid = pg_class.oid
WHERE schemaname = 'public'
  AND tablename IN ('support_threads_data', 'ai_human_comparison', 'support_dialogs')
ORDER BY tablename, indexname;

-- ===========================================
-- 5. ANALYZE TABLES (Update statistics for query planner)
-- ===========================================
ANALYZE support_threads_data;
ANALYZE ai_human_comparison;
ANALYZE support_dialogs;

-- Done! After running this script:
-- 1. Refresh Security Advisor in Supabase dashboard
-- 2. Check Disk IO consumption in the next few hours
-- 3. Monitor query performance
