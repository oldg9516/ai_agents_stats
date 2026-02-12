/**
 * Action Analysis Quality Database Queries
 *
 * Fetches records that have both AI action_analysis and agent verification
 * from ai_comparison_with_reviews VIEW + support_threads_data enrichment.
 * Used for measuring accuracy of AI action determination.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	ActionAnalysis,
	ActionAnalysisFilters,
	ActionAnalysisRecord,
	ActionAnalysisVerification,
} from './types'

const BATCH_SIZE = 1000
const THREAD_BATCH_SIZE = 500

/**
 * Build filter conditions for a query on ai_comparison_with_reviews
 */
function applyFilters(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	query: any,
	filters: ActionAnalysisFilters
) {
	const { dateRange, categories, versions, agents } = filters

	let q = query
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())
		.not('action_analysis_verification', 'is', null)
		.neq('email', 'api@levhaolam.com')

	if (categories.length > 0) q = q.in('request_subtype', categories)
	if (versions.length > 0) q = q.in('prompt_version', versions)
	if (agents.length > 0) q = q.in('email', agents)

	return q
}

/**
 * Fetch verified action analysis records
 *
 * 1. Query ai_comparison_with_reviews VIEW for records with verification
 * 2. Batch fetch support_threads_data for action_analysis + request_sub_subtype
 * 3. Parse action_analysis JSON text
 * 4. Return enriched records
 */
export async function fetchActionAnalysisData(
	supabase: SupabaseClient,
	filters: ActionAnalysisFilters
): Promise<ActionAnalysisRecord[]> {
	// Step 1: Get total count
	const countQuery = applyFilters(
		supabase.from('ai_comparison_with_reviews').select('id', { count: 'exact', head: true }),
		filters
	)

	const { count, error: countError } = await countQuery
	if (countError) throw countError

	const totalRecords = count ?? 0
	if (totalRecords === 0) return []

	// Step 2: Fetch records in batches (bypasses Supabase 1000-row default limit)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const records: any[] = []
	const numBatches = Math.ceil(totalRecords / BATCH_SIZE)

	for (let i = 0; i < numBatches; i++) {
		const batchQuery = applyFilters(
			supabase.from('ai_comparison_with_reviews').select(`
				id,
				created_at,
				request_subtype,
				email,
				prompt_version,
				thread_id,
				action_analysis_verification
			`),
			filters
		).range(i * BATCH_SIZE, (i + 1) * BATCH_SIZE - 1)

		const { data: batchData, error: batchError } = await batchQuery
		if (batchError) throw batchError
		if (batchData) records.push(...batchData)
	}

	if (records.length === 0) return []

	// Step 3: Batch fetch support_threads_data for action_analysis enrichment
	const threadIds = records
		.map((r: { thread_id: string | null }) => r.thread_id)
		.filter(Boolean) as string[]

	if (threadIds.length === 0) return []

	const uniqueThreadIds = [...new Set(threadIds)]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const allThreadsData: any[] = []

	for (let i = 0; i < uniqueThreadIds.length; i += THREAD_BATCH_SIZE) {
		const batch = uniqueThreadIds.slice(i, i + THREAD_BATCH_SIZE)
		const { data: batchData, error: batchError } = await supabase
			.from('support_threads_data')
			.select('thread_id, action_analysis, request_sub_subtype')
			.in('thread_id', batch)

		if (batchError) {
			console.error('[ActionAnalysis] Error fetching thread data batch:', batchError)
			continue
		}
		if (batchData) allThreadsData.push(...batchData)
	}

	// Step 4: Build Maps for O(1) lookups (js-index-maps)
	const actionAnalysisMap = new Map<string, ActionAnalysis | null>()
	const subSubTypeMap = new Map<string, string | null>()

	for (const thread of allThreadsData) {
		if (!thread.thread_id) continue

		if (thread.request_sub_subtype) {
			subSubTypeMap.set(thread.thread_id, thread.request_sub_subtype)
		}

		if (thread.action_analysis) {
			try {
				const parsed = typeof thread.action_analysis === 'string'
					? JSON.parse(thread.action_analysis)
					: thread.action_analysis
				actionAnalysisMap.set(thread.thread_id, parsed)
			} catch (e) {
				console.error('[ActionAnalysis] Error parsing action_analysis JSON:', e)
				actionAnalysisMap.set(thread.thread_id, null)
			}
		}
	}

	// Step 5: Enrich and filter — only include records with BOTH action_analysis and verification
	const enriched: ActionAnalysisRecord[] = []

	for (const record of records) {
		const threadId = record.thread_id as string | null
		if (!threadId) continue

		const actionAnalysis = actionAnalysisMap.get(threadId) ?? null
		const verification = record.action_analysis_verification as ActionAnalysisVerification | null

		if (!actionAnalysis || !verification) continue

		enriched.push({
			id: record.id,
			created_at: record.created_at,
			request_subtype: record.request_subtype,
			request_sub_subtype: subSubTypeMap.get(threadId) ?? null,
			email: record.email,
			prompt_version: record.prompt_version,
			action_analysis: actionAnalysis,
			verification,
		})
	}

	return enriched
}
