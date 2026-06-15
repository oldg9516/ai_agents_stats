/**
 * Automation Overview Database Queries (Drizzle)
 *
 * Primary source: support_threads_data
 * Fields: thread_id, request_subtype, request_sub_subtype, prompt_version,
 *         created_at, action_analysis (JSON), is_outstanding (boolean)
 *
 * Enriched with ai_human_comparison.changed for quality metrics
 *
 * Filter: action_analysis IS NOT NULL AND status = 'ZOHO draft created'
 *
 * No batch fetching needed — direct pg has no row limit.
 */

import { db } from './index'
import { and, gte, lt, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { supportThreadsData, aiHumanComparison } from './schema'
import type {
	ActionAnalysis,
	AutomationOverviewFilters,
	AutomationOverviewRecord,
} from './types'

/**
 * Fetch automation overview records from support_threads_data
 * and enrich with quality data (changed field) from ai_human_comparison
 */
export async function fetchAutomationOverviewData(
	filters: AutomationOverviewFilters
): Promise<AutomationOverviewRecord[]> {
	const { dateRange, categories, versions } = filters

	// Build conditions
	const conditions = [
		isNotNull(supportThreadsData.actionAnalysis),
		eq(supportThreadsData.status, 'ZOHO draft created'),
		gte(supportThreadsData.createdAt, dateRange.from),
		lt(supportThreadsData.createdAt, dateRange.to),
	]

	if (categories.length > 0) {
		conditions.push(
			inArray(supportThreadsData.requestSubtype, categories)
		)
	}
	if (versions.length > 0) {
		conditions.push(
			inArray(supportThreadsData.promptVersion, versions)
		)
	}

	// Single query — no batch fetching needed
	const records = await db
		.select({
			threadId: supportThreadsData.threadId,
			ticketId: supportThreadsData.ticketId,
			requestSubtype: supportThreadsData.requestSubtype,
			requestSubSubtype: supportThreadsData.requestSubSubtype,
			promptVersion: supportThreadsData.promptVersion,
			createdAt: supportThreadsData.createdAt,
			actionAnalysis: supportThreadsData.actionAnalysis,
			isOutstanding: supportThreadsData.isOutstanding,
		})
		.from(supportThreadsData)
		.where(and(...conditions))

	if (records.length === 0) return []

	// Parse action_analysis and build records
	const enriched: AutomationOverviewRecord[] = []

	for (const record of records) {
		let actionAnalysis: ActionAnalysis | null = null
		try {
			actionAnalysis =
				typeof record.actionAnalysis === 'string'
					? JSON.parse(record.actionAnalysis)
					: record.actionAnalysis
		} catch {
			continue
		}

		if (!actionAnalysis) continue

		enriched.push({
			thread_id: record.threadId,
			ticket_id: (record.ticketId as unknown as number) ?? null,
			created_at: record.createdAt?.toISOString() ?? '',
			request_subtype: record.requestSubtype,
			request_sub_subtype: record.requestSubSubtype ?? null,
			prompt_version: record.promptVersion,
			action_analysis: actionAnalysis,
			is_outstanding: record.isOutstanding ?? null,
			changed: null,
			actual_outcome: null,
		})
	}

	const threadIds = enriched.map((r) => r.thread_id)

	// Fetch quality data (changed field) + actual outcome (auto_reply/draft) in parallel
	const [changedMap, outcomeMap] = await Promise.all([
		fetchChangedByThreadIds(threadIds),
		fetchActualOutcomeByThreadIds(threadIds),
	])

	// Merge quality + ground-truth outcome into records
	for (const record of enriched) {
		const changed = changedMap.get(record.thread_id)
		if (changed !== undefined) {
			record.changed = changed
		}
		record.actual_outcome = outcomeMap.get(record.thread_id) ?? null
	}

	return enriched
}

/**
 * Fetch the actual outcome (auto_reply / draft) from ai_agent_tasks per thread.
 *
 * Ground truth: the `request` payload of the latest send_prepared_answer task
 * for the thread. send_reply → auto_reply, send_draft → draft. Anything else
 * (e.g. pure close_ticket) returns null so the caller can fall back.
 *
 * One row per thread via DISTINCT ON ... ORDER BY created_at DESC (reruns → latest).
 */
async function fetchActualOutcomeByThreadIds(
	threadIds: string[]
): Promise<Map<string, 'auto_reply' | 'draft'>> {
	const result = new Map<string, 'auto_reply' | 'draft'>()
	if (threadIds.length === 0) return result

	const uniqueIds = [...new Set(threadIds)]

	// Pass thread ids as a SINGLE text[] parameter (a PG array literal), not an
	// expanded list. Drizzle would otherwise expand a JS array into
	// `ANY(($1, $2, ...))` — a ROW expression capped at 1664 entries that also
	// ignores the thread_id index. ANY(text[]) is one param and uses the index.
	const arrayLiteral =
		'{' +
		uniqueIds
			.map((id) => `"${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
			.join(',') +
		'}'

	const rows = await db.execute(sql`
		SELECT DISTINCT ON (thread_id)
			thread_id,
			CASE
				WHEN request LIKE '%"send_reply"%' THEN 'auto_reply'
				WHEN request LIKE '%"send_draft"%' THEN 'draft'
				ELSE NULL
			END AS outcome
		FROM ai_agent_tasks
		WHERE type = 'send_prepared_answer'
			AND thread_id = ANY(${arrayLiteral}::text[])
		ORDER BY thread_id, created_at DESC
	`)

	for (const row of (rows.rows ?? []) as {
		thread_id: string
		outcome: 'auto_reply' | 'draft' | null
	}[]) {
		if (row.thread_id && row.outcome) {
			result.set(row.thread_id, row.outcome)
		}
	}

	return result
}

/**
 * Fetch `changed` field from ai_human_comparison for given thread_ids.
 * changed = false means AI response was good (human didn't change it)
 * changed = true means AI response needed changes
 * undefined means no match found in ai_human_comparison
 *
 * No batch fetching needed — direct pg has no row limit.
 */
async function fetchChangedByThreadIds(
	threadIds: string[]
): Promise<Map<string, boolean | null>> {
	const result = new Map<string, boolean | null>()
	if (threadIds.length === 0) return result

	const uniqueIds = [...new Set(threadIds)]

	// Single query — no batching needed
	const data = await db
		.select({
			threadId: aiHumanComparison.threadId,
			changed: aiHumanComparison.changed,
		})
		.from(aiHumanComparison)
		.where(inArray(aiHumanComparison.threadId, uniqueIds))

	for (const row of data) {
		if (row.threadId) {
			result.set(row.threadId, row.changed ?? null)
		}
	}

	return result
}
