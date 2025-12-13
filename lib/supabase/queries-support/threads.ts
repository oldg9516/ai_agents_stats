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
 * Check if there's a human response (direction='out') AFTER the AI thread
 * in support_dialogs table for each thread
 */
async function fetchHumanResponsesInBatches(
	supabase: SupabaseClient,
	threads: { thread_id: string; ticket_id: string }[]
): Promise<Map<string, boolean>> {
	const result = new Map<string, boolean>()
	if (threads.length === 0) return result

	// Group threads by ticket_id for efficient querying
	const ticketToThreads = new Map<string, { thread_id: string; ticket_id: string }[]>()
	threads.forEach(t => {
		if (!t.ticket_id) return
		const existing = ticketToThreads.get(t.ticket_id) || []
		existing.push(t)
		ticketToThreads.set(t.ticket_id, existing)
	})

	const ticketIds = [...ticketToThreads.keys()]
	const BATCH_SIZE = 50 // Smaller batches for complex queries
	const MAX_CONCURRENT = 3

	// Fetch all outgoing messages for these tickets
	for (let i = 0; i < ticketIds.length; i += BATCH_SIZE * MAX_CONCURRENT) {
		const batchPromises: Promise<void>[] = []

		for (let j = 0; j < MAX_CONCURRENT && i + j * BATCH_SIZE < ticketIds.length; j++) {
			const start = i + j * BATCH_SIZE
			const batchTicketIds = ticketIds.slice(start, start + BATCH_SIZE)

			const promise = (async () => {
				const { data, error } = await supabase
					.from('support_dialogs')
					.select('ticket_id, thread_id')
					.in('ticket_id', batchTicketIds)
					.eq('direction', 'out')

				if (error) {
					console.error('Error fetching human responses:', error)
					return
				}

				// For each thread, check if there's an outgoing message with higher thread_id
				data?.forEach(dialog => {
					const dialogThreadId = BigInt(dialog.thread_id)
					const threadsForTicket = ticketToThreads.get(dialog.ticket_id) || []

					threadsForTicket.forEach(t => {
						const aiThreadId = BigInt(t.thread_id)
						// If there's an outgoing message AFTER the AI thread, mark it as having human response
						if (dialogThreadId > aiThreadId) {
							result.set(t.thread_id, true)
						}
					})
				})
			})()

			batchPromises.push(promise)
		}

		await Promise.all(batchPromises)

		// Small delay between batch groups
		if (i + BATCH_SIZE * MAX_CONCURRENT < ticketIds.length) {
			await new Promise(resolve => setTimeout(resolve, 50))
		}
	}

	return result
}

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

	// Get ticket_ids for checking human responses in support_dialogs
	const ticketIds = [...new Set(threads.map(t => t.ticket_id as string).filter(Boolean))]

	// Fetch comparison, dialog data, and human responses in batches
	const [comparisonData, dialogData, humanResponseData] = await Promise.all([
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
		// Fetch outgoing messages (human responses) from support_dialogs for each ticket
		// This checks if there's any 'out' direction message AFTER the AI thread
		fetchHumanResponsesInBatches(supabase, threads as { thread_id: string; ticket_id: string }[]),
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
		// Check if there's a human response AFTER this AI thread in support_dialogs
		const hasHumanResponseInDialogs = humanResponseData.get(threadId) ?? false

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
			// Add flag for human response check from support_dialogs
			hasHumanResponseAfterAI: hasHumanResponseInDialogs,
		}
	})

	// If pendingDraftsOnly is enabled, filter out threads that have human response
	// A thread is "pending" if:
	// 1. It has AI draft
	// 2. There's NO outgoing message (direction='out') in support_dialogs AFTER the AI thread
	if (pendingDraftsOnly) {
		enrichedThreads = enrichedThreads.filter(
			thread =>
				thread.ai_draft_reply !== null &&
				!thread.hasHumanResponseAfterAI
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
