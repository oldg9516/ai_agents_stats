/**
 * Action Analysis Quality Database Queries (Drizzle)
 *
 * Primary source: support_threads_data (where action_analysis lives)
 * Verification: ai_comparison_with_reviews VIEW (action_analysis_verification from ticket_reviews)
 *
 * Flow:
 * 1. Query support_threads_data where action_analysis IS NOT NULL
 * 2. Fetch verification data from ai_comparison_with_reviews by thread_id
 * 3. Return enriched records
 *
 * No batch fetching needed — direct pg has no row limit.
 */

import { db } from './index'
import { and, gte, lt, inArray, isNotNull } from 'drizzle-orm'
import { supportThreadsData, aiComparisonWithReviews } from './schema'
import type {
	ActionAnalysis,
	ActionAnalysisFilters,
	ActionAnalysisRecord,
	ActionAnalysisVerification,
} from './types'

/**
 * Fetch action analysis records from support_threads_data
 *
 * 1. Query support_threads_data where action_analysis is not null
 * 2. Fetch verification from ai_comparison_with_reviews
 * 3. Return enriched records
 */
export async function fetchActionAnalysisData(
	filters: ActionAnalysisFilters
): Promise<ActionAnalysisRecord[]> {
	const { dateRange, categories, versions } = filters

	// Build conditions
	const conditions = [
		isNotNull(supportThreadsData.actionAnalysis),
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
			requestSubtype: supportThreadsData.requestSubtype,
			requestSubSubtype: supportThreadsData.requestSubSubtype,
			promptVersion: supportThreadsData.promptVersion,
			createdAt: supportThreadsData.createdAt,
			actionAnalysis: supportThreadsData.actionAnalysis,
		})
		.from(supportThreadsData)
		.where(and(...conditions))

	if (records.length === 0) return []

	// Fetch verification data from ai_comparison_with_reviews
	const threadIds = records.map((r) => r.threadId)
	const uniqueThreadIds = [...new Set(threadIds)]

	const verificationRows = await db
		.select({
			threadId: aiComparisonWithReviews.threadId,
			actionAnalysisVerification:
				aiComparisonWithReviews.actionAnalysisVerification,
		})
		.from(aiComparisonWithReviews)
		.where(
			and(
				inArray(aiComparisonWithReviews.threadId, uniqueThreadIds),
				isNotNull(
					aiComparisonWithReviews.actionAnalysisVerification
				)
			)
		)

	const verificationMap = new Map<string, ActionAnalysisVerification>()
	for (const row of verificationRows) {
		if (row.threadId && row.actionAnalysisVerification) {
			const parsed =
				typeof row.actionAnalysisVerification === 'string'
					? JSON.parse(row.actionAnalysisVerification)
					: row.actionAnalysisVerification
			verificationMap.set(row.threadId, parsed)
		}
	}

	// Build enriched records
	const enriched: ActionAnalysisRecord[] = []

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
			created_at: record.createdAt?.toISOString() ?? '',
			request_subtype: record.requestSubtype,
			request_sub_subtype: record.requestSubSubtype ?? null,
			prompt_version: record.promptVersion,
			action_analysis: actionAnalysis,
			verification: verificationMap.get(record.threadId) ?? null,
		})
	}

	return enriched
}
