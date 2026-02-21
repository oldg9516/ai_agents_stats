/**
 * Automation Overview Database Queries
 *
 * Primary source: support_threads_data
 * Fields: thread_id, request_subtype, request_sub_subtype, prompt_version,
 *         created_at, action_analysis (JSON), is_outstanding (boolean)
 *
 * Filter: action_analysis IS NOT NULL
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActionAnalysis, AutomationOverviewFilters, AutomationOverviewRecord } from './types'

const BATCH_SIZE = 1000

/**
 * Fetch automation overview records from support_threads_data
 *
 * Selects records where action_analysis is not null,
 * including is_outstanding for retention rule logic.
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
			.select('thread_id, request_subtype, request_sub_subtype, prompt_version, created_at, action_analysis, is_outstanding')
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
			created_at: record.created_at,
			request_subtype: record.request_subtype,
			request_sub_subtype: record.request_sub_subtype ?? null,
			prompt_version: record.prompt_version,
			action_analysis: actionAnalysis,
			is_outstanding: record.is_outstanding ?? null,
		})
	}

	return enriched
}
