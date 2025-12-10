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

/**
 * Fetch Support Threads with JOIN to ai_human_comparison
 */
export async function fetchSupportThreads(
	supabase: SupabaseClient,
	filters: SupportFilters,
	options?: { limit?: number; offset?: number }
): Promise<SupportThread[]> {
	const { dateRange, statuses, requestTypes, requirements, versions } = filters
	const { limit = 100, offset = 0 } = options || {}

	// First fetch support threads with filters + pagination
	let query = supabase
		.from('support_threads_data')
		.select('*')
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())
		.order('created_at', { ascending: false }) // Most recent first
		.range(offset, offset + limit - 1) // Pagination

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

	const { data: threads, error: threadsError } = await query

	if (threadsError) throw threadsError
	if (!threads || threads.length === 0) return []

	// Get thread IDs
	const threadIds = threads.map(t => t.thread_id)

	// Fetch all comparison data in a single query by thread_id
	const { data: comparisonData, error: comparisonError } = await supabase
		.from('ai_human_comparison')
		.select('thread_id, changed, email, human_reply')
		.in('thread_id', threadIds)

	if (comparisonError) {
		console.error('Error fetching comparison data:', comparisonError)
	}

	// Fetch all dialog data (direction and text) in a single query by thread_id
	const { data: dialogData, error: dialogError } = await supabase
		.from('support_dialogs')
		.select('thread_id, direction, text')
		.in('thread_id', threadIds)

	if (dialogError) {
		console.error('Error fetching dialog data:', dialogError)
	}

	// Create a map of thread_id -> comparison data
	const comparisonMap = new Map<
		string,
		{
			changed: boolean | null
			email: string | null
			human_reply: string | null
		}
	>()

	comparisonData?.forEach(comp => {
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

	dialogData?.forEach(dialog => {
		if (dialog.thread_id) {
			dialogMap.set(dialog.thread_id, {
				direction: dialog.direction ?? null,
				text: dialog.text ?? null,
			})
		}
	})

	// Enrich threads with comparison and dialog data
	const enrichedThreads: SupportThread[] = threads.map(thread => {
		const comparison = comparisonMap.get(thread.thread_id)
		const dialog = dialogMap.get(thread.thread_id)

		return {
			...thread,
			changed: comparison?.changed ?? null,
			email: comparison?.email ?? null,
			human_reply: comparison?.human_reply ?? null,
			direction: dialog?.direction ?? null,
			customer_request_text: dialog?.text ?? null,
			qualityPercentage:
				comparison?.changed === false
					? 100
					: comparison?.changed === true
					? 0
					: null,
		}
	})

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
