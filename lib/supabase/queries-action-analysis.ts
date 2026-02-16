/**
 * Action Analysis Quality Database Queries
 *
 * Primary source: support_threads_data (where action_analysis lives)
 * Verification: ai_comparison_with_reviews VIEW (action_analysis_verification from ticket_reviews)
 *
 * Flow:
 * 1. Query support_threads_data where action_analysis IS NOT NULL
 * 2. Batch fetch verification data from ai_comparison_with_reviews by thread_id
 * 3. Return enriched records
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	ActionAnalysis,
	ActionAnalysisFilters,
	ActionAnalysisRecord,
	ActionAnalysisVerification,
} from './types'

const BATCH_SIZE = 1000

/**
 * Fetch action analysis records from support_threads_data
 *
 * 1. Query support_threads_data where action_analysis is not null
 * 2. Batch fetch verification from ai_comparison_with_reviews
 * 3. Return enriched records
 */
export async function fetchActionAnalysisData(
	supabase: SupabaseClient,
	filters: ActionAnalysisFilters
): Promise<ActionAnalysisRecord[]> {
	const { dateRange, categories, versions } = filters

	// Step 1: Count records in support_threads_data with action_analysis
	let countQuery = (supabase as any)
		.from('support_threads_data')
		.select('thread_id', { count: 'exact', head: true })
		.not('action_analysis', 'is', null)
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())

	if (categories.length > 0) countQuery = countQuery.in('request_subtype', categories)
	if (versions.length > 0) countQuery = countQuery.in('prompt_version', versions)

	const { count, error: countError } = await countQuery
	if (countError) throw countError

	const totalRecords = count ?? 0
	if (totalRecords === 0) return []

	// Step 2: Fetch records in batches
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const records: any[] = []
	const numBatches = Math.ceil(totalRecords / BATCH_SIZE)

	for (let i = 0; i < numBatches; i++) {
		let batchQuery = (supabase as any)
			.from('support_threads_data')
			.select('thread_id, request_subtype, request_sub_subtype, prompt_version, created_at, action_analysis')
			.not('action_analysis', 'is', null)
			.gte('created_at', dateRange.from.toISOString())
			.lt('created_at', dateRange.to.toISOString())
			.range(i * BATCH_SIZE, (i + 1) * BATCH_SIZE - 1)

		if (categories.length > 0) batchQuery = batchQuery.in('request_subtype', categories)
		if (versions.length > 0) batchQuery = batchQuery.in('prompt_version', versions)

		const { data: batchData, error: batchError } = await batchQuery
		if (batchError) throw batchError
		if (batchData) records.push(...batchData)
	}

	if (records.length === 0) return []

	// Step 3: Batch fetch verification data from ai_comparison_with_reviews
	const threadIds = records.map((r: { thread_id: string }) => r.thread_id)
	const uniqueThreadIds = [...new Set(threadIds)]
	const verificationMap = new Map<string, ActionAnalysisVerification>()

	for (let i = 0; i < uniqueThreadIds.length; i += BATCH_SIZE) {
		const batch = uniqueThreadIds.slice(i, i + BATCH_SIZE)
		const { data: verData, error: verError } = await (supabase as any)
			.from('ai_comparison_with_reviews')
			.select('thread_id, action_analysis_verification')
			.in('thread_id', batch)
			.not('action_analysis_verification', 'is', null)

		if (verError) {
			console.error('[ActionAnalysis] Error fetching verification batch:', verError)
			continue
		}
		if (verData) {
			for (const row of verData) {
				if (row.thread_id && row.action_analysis_verification) {
					verificationMap.set(row.thread_id, row.action_analysis_verification)
				}
			}
		}
	}

	// Step 4: Build enriched records
	const enriched: ActionAnalysisRecord[] = []

	for (const record of records) {
		let actionAnalysis: ActionAnalysis | null = null
		try {
			actionAnalysis = typeof record.action_analysis === 'string'
				? JSON.parse(record.action_analysis)
				: record.action_analysis
		} catch {
			continue
		}

		if (!actionAnalysis) continue

		enriched.push({
			thread_id: record.thread_id,
			created_at: record.created_at,
			request_subtype: record.request_subtype,
			request_sub_subtype: record.request_sub_subtype ?? null,
			prompt_version: record.prompt_version,
			action_analysis: actionAnalysis,
			verification: verificationMap.get(record.thread_id) ?? null,
		})
	}

	return enriched
}
