/**
 * Automation Overview Database Queries
 *
 * Primary source: support_threads_data
 * Fields: thread_id, request_subtype, request_sub_subtype, prompt_version,
 *         created_at, action_analysis (JSON), is_outstanding (boolean)
 *
 * Enriched with ai_human_comparison.changed for quality metrics
 *
 * Filter: action_analysis IS NOT NULL AND status = 'ZOHO draft created'
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActionAnalysis, AutomationOverviewFilters, AutomationOverviewRecord } from './types'

const BATCH_SIZE = 1000
const QUALITY_BATCH_SIZE = 500

/**
 * Fetch automation overview records from support_threads_data
 * and enrich with quality data (changed field) from ai_human_comparison
 */
export async function fetchAutomationOverviewData(
	supabase: SupabaseClient,
	filters: AutomationOverviewFilters
): Promise<AutomationOverviewRecord[]> {
	const { dateRange, categories, versions } = filters

	// Step 1: Count records
	let countQuery = (supabase as any)
		.from('support_threads_data')
		.select('thread_id', { count: 'exact', head: true })
		.not('action_analysis', 'is', null)
		.eq('status', 'ZOHO draft created')
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())

	if (categories.length > 0) countQuery = countQuery.in('request_subtype', categories)
	if (versions.length > 0) countQuery = countQuery.in('prompt_version', versions)

	const { count, error: countError } = await countQuery
	if (countError) throw countError

	const totalRecords = count ?? 0
	if (totalRecords === 0) return []

	// Step 2: Fetch records in batches
	const records: any[] = []
	const numBatches = Math.ceil(totalRecords / BATCH_SIZE)

	for (let i = 0; i < numBatches; i++) {
		let batchQuery = (supabase as any)
			.from('support_threads_data')
			.select('thread_id, ticket_id, request_subtype, request_sub_subtype, prompt_version, created_at, action_analysis, is_outstanding')
			.not('action_analysis', 'is', null)
			.eq('status', 'ZOHO draft created')
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

	// Step 3: Parse action_analysis and build records
	const enriched: AutomationOverviewRecord[] = []

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
			ticket_id: record.ticket_id ?? null,
			created_at: record.created_at,
			request_subtype: record.request_subtype,
			request_sub_subtype: record.request_sub_subtype ?? null,
			prompt_version: record.prompt_version,
			action_analysis: actionAnalysis,
			is_outstanding: record.is_outstanding ?? null,
			changed: null,
		})
	}

	// Step 4: Fetch quality data (changed field) from ai_human_comparison by thread_id
	const threadIds = enriched.map(r => r.thread_id)
	const changedMap = await fetchChangedByThreadIds(supabase, threadIds)

	// Merge quality data into records
	for (const record of enriched) {
		const changed = changedMap.get(record.thread_id)
		if (changed !== undefined) {
			record.changed = changed
		}
	}

	return enriched
}

/**
 * Fetch `changed` field from ai_human_comparison for given thread_ids, in batches.
 * changed = false means AI response was good (human didn't change it)
 * changed = true means AI response needed changes
 * undefined means no match found in ai_human_comparison
 */
async function fetchChangedByThreadIds(
	supabase: SupabaseClient,
	threadIds: string[]
): Promise<Map<string, boolean | null>> {
	const result = new Map<string, boolean | null>()
	if (threadIds.length === 0) return result

	const uniqueIds = [...new Set(threadIds)]

	for (let i = 0; i < uniqueIds.length; i += QUALITY_BATCH_SIZE) {
		const batch = uniqueIds.slice(i, i + QUALITY_BATCH_SIZE)

		const { data, error } = await (supabase as any)
			.from('ai_human_comparison')
			.select('thread_id, changed')
			.in('thread_id', batch)

		if (error) {
			console.error('Error fetching quality data:', error)
			continue
		}

		if (data) {
			for (const row of data) {
				result.set(row.thread_id, row.changed ?? null)
			}
		}
	}

	return result
}
