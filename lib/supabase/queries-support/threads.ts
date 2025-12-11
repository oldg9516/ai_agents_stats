/**
 * Support Thread Queries
 * Fetching thread lists, details, and category stats
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	RequestCategoryStats,
	SupportFilters,
	SupportThread,
} from '../types'

// Supabase default max is 1000, use smaller batches to avoid timeouts
const SUPABASE_BATCH_SIZE = 300

/**
 * Build base query with filters (without pagination)
 */
function buildThreadsQuery(
	supabase: SupabaseClient,
	filters: SupportFilters
) {
	const {
		dateRange,
		statuses,
		requestTypes,
		requirements,
		versions,
		pendingDraftsOnly,
	} = filters

	let query = supabase
		.from('support_threads_data')
		.select('*', { count: 'exact' })
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())
		.order('created_at', { ascending: false })

	if (statuses.length > 0) {
		query = query.in('status', statuses)
	}
	if (requestTypes.length > 0) {
		query = query.in('request_type', requestTypes)
	}
	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (requirements.length > 0) {
		requirements.forEach(req => {
			query = query.eq(req, true)
		})
	}
	if (pendingDraftsOnly) {
		query = query.not('ai_draft_reply', 'is', null)
	}

	return query
}

/**
 * Fetch Support Threads with JOIN to ai_human_comparison
 * If fetchAll is true, fetches all records in batches (for export)
 */
export async function fetchSupportThreads(
	supabase: SupabaseClient,
	filters: SupportFilters,
	options?: { limit?: number; offset?: number; fetchAll?: boolean }
): Promise<SupportThread[]> {
	const { limit, offset = 0, fetchAll = false } = options || {}

	let threads: Record<string, unknown>[] = []

	if (fetchAll) {
		// First, get total count to know how many batches we need
		const countQuery = buildThreadsQuery(supabase, filters)
		const { count, error: countError } = await countQuery

		if (countError) throw countError

		const totalRecords = count || 0

		if (totalRecords === 0) return []

		// Calculate number of batches needed
		const numBatches = Math.ceil(totalRecords / SUPABASE_BATCH_SIZE)

		// Fetch all batches in parallel (limit concurrency to avoid overwhelming DB)
		const MAX_CONCURRENT = 3
		const DELAY_BETWEEN_GROUPS = 100 // ms delay between batch groups

		for (let batchStart = 0; batchStart < numBatches; batchStart += MAX_CONCURRENT) {
			const batchPromises = []
			for (
				let i = batchStart;
				i < Math.min(batchStart + MAX_CONCURRENT, numBatches);
				i++
			) {
				const offset = i * SUPABASE_BATCH_SIZE
				const promise = buildThreadsQuery(supabase, filters)
					.range(offset, offset + SUPABASE_BATCH_SIZE - 1)
					.then(({ data, error }) => {
						if (error) throw error
						return data || []
					})
				batchPromises.push(promise)
			}
			const batchResults = await Promise.all(batchPromises)
			threads.push(...batchResults.flat())

			// Small delay between batch groups to reduce DB load
			if (batchStart + MAX_CONCURRENT < numBatches) {
				await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_GROUPS))
			}
		}
	} else {
		// Regular paginated fetch
		const query = buildThreadsQuery(supabase, filters)

		if (limit !== undefined) {
			query.range(offset, offset + limit - 1)
		} else {
			// Default to 1000 if no limit specified
			query.range(offset, offset + SUPABASE_BATCH_SIZE - 1)
		}

		const { data, error } = await query

		if (error) throw error
		threads = data || []
	}

	if (threads.length === 0) return []

	// Get thread IDs
	const threadIds = threads.map(t => t.thread_id as string)

	// Helper to fetch data in batches (Supabase .in() also has limits)
	// Runs batches with limited concurrency to avoid overwhelming DB
	async function fetchInBatches<T>(
		table: string,
		selectFields: string,
		ids: string[],
		batchSize = 300
	): Promise<T[]> {
		// Split IDs into batches
		const batches: string[][] = []
		for (let i = 0; i < ids.length; i += batchSize) {
			batches.push(ids.slice(i, i + batchSize))
		}

		const results: T[] = []
		const MAX_CONCURRENT = 3
		const DELAY_BETWEEN_GROUPS = 50 // ms

		// Run batches with limited concurrency
		for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
			const batchGroup = batches.slice(i, i + MAX_CONCURRENT)
			const groupPromises = batchGroup.map(async batchIds => {
				const { data, error } = await supabase
					.from(table)
					.select(selectFields)
					.in('thread_id', batchIds)

				if (error) {
					console.error(`Error fetching ${table} data:`, error)
					return []
				}
				return (data || []) as T[]
			})

			const groupResults = await Promise.all(groupPromises)
			results.push(...groupResults.flat())

			// Small delay between groups
			if (i + MAX_CONCURRENT < batches.length) {
				await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_GROUPS))
			}
		}

		return results
	}

	// Fetch comparison and dialog data in batches
	const [comparisonData, dialogData] = await Promise.all([
		fetchInBatches<{
			thread_id: string
			changed: boolean | null
			email: string | null
			human_reply: string | null
		}>('ai_human_comparison', 'thread_id, changed, email, human_reply', threadIds),
		fetchInBatches<{
			thread_id: string
			direction: string | null
			text: string | null
		}>('support_dialogs', 'thread_id, direction, text', threadIds),
	])

	// Create a map of thread_id -> comparison data
	const comparisonMap = new Map<
		string,
		{
			changed: boolean | null
			email: string | null
			human_reply: string | null
		}
	>()

	comparisonData.forEach(comp => {
		if (comp.thread_id) {
			comparisonMap.set(comp.thread_id, {
				changed: comp.changed,
				email: comp.email,
				human_reply: comp.human_reply,
			})
		}
	})

	// Create a map of thread_id -> dialog data (direction and text)
	const dialogMap = new Map<
		string,
		{ direction: string | null; text: string | null }
	>()

	dialogData.forEach(dialog => {
		if (dialog.thread_id) {
			dialogMap.set(dialog.thread_id, {
				direction: dialog.direction ?? null,
				text: dialog.text ?? null,
			})
		}
	})

	// Helper to parse customer email from user JSON field
	function parseCustomerEmail(userField: unknown): string | null {
		if (!userField) return null
		try {
			// user field is a JSON string like: {"name":"","email":"user@example.com",...}
			const userData =
				typeof userField === 'string' ? JSON.parse(userField) : userField
			return userData?.email ?? null
		} catch {
			return null
		}
	}

	// Enrich threads with comparison and dialog data
	const { pendingDraftsOnly } = filters
	let enrichedThreads: SupportThread[] = threads.map(thread => {
		const threadId = thread.thread_id as string
		const comparison = comparisonMap.get(threadId)
		const dialog = dialogMap.get(threadId)

		return {
			...(thread as unknown as SupportThread),
			changed: comparison?.changed ?? null,
			email: comparison?.email ?? null,
			human_reply: comparison?.human_reply ?? null,
			direction: dialog?.direction ?? null,
			customer_request_text: dialog?.text ?? null,
			customer_email: parseCustomerEmail(thread.user),
			qualityPercentage:
				comparison?.changed === false
					? 100
					: comparison?.changed === true
					? 0
					: null,
		}
	})

	// If pendingDraftsOnly is enabled, filter out threads that have agent response
	// A thread is "pending" if it has AI draft but no agent has processed it yet
	if (pendingDraftsOnly) {
		enrichedThreads = enrichedThreads.filter(
			thread =>
				thread.ai_draft_reply !== null &&
				(thread.email === null || thread.human_reply === null)
		)
	}

	return enrichedThreads
}

/**
 * Fetch single thread detail
 */
export async function fetchThreadDetail(
	supabase: SupabaseClient,
	threadId: string
): Promise<SupportThread | null> {
	const { data: thread, error: threadError } = await supabase
		.from('support_threads_data')
		.select('*')
		.eq('thread_id', threadId)
		.single()

	if (threadError) throw threadError
	if (!thread) return null

	// Try to find matching comparison record by thread_id
	const { data: comparisonData } = await supabase
		.from('ai_human_comparison')
		.select('changed, email, human_reply')
		.eq('thread_id', threadId)
		.limit(1)
		.single()

	// Try to find direction and customer request text from support_dialogs
	const { data: dialogData } = await supabase
		.from('support_dialogs')
		.select('direction, text')
		.eq('thread_id', threadId)
		.limit(1)
		.single()

	return {
		...thread,
		changed: comparisonData?.changed ?? null,
		email: comparisonData?.email ?? null,
		human_reply: comparisonData?.human_reply ?? null,
		direction: dialogData?.direction ?? null,
		customer_request_text: dialogData?.text ?? null,
		qualityPercentage:
			comparisonData?.changed === false
				? 100
				: comparisonData?.changed === true
				? 0
				: null,
	}
}

/**
 * Fetch Request Category Statistics
 * Shows breakdown of request_type and request_subtype with counts and percentages
 * Groups multiple subtypes (containing comma) as "multiply"
 */
export async function fetchRequestCategoryStats(
	supabase: SupabaseClient,
	dateRange: { from: Date; to: Date }
): Promise<RequestCategoryStats[]> {
	// Use SQL RPC function for accurate calculations with date filter
	const { data, error } = await supabase.rpc('get_request_category_stats', {
		date_from: dateRange.from.toISOString(),
		date_to: dateRange.to.toISOString(),
	})

	if (error) {
		console.error('[Request Categories] RPC error:', error)
		throw error
	}

	return (data || []) as RequestCategoryStats[]
}
