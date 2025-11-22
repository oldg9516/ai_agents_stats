/**
 * Tickets Review Database Queries
 *
 * All queries for the Tickets Review section
 * Fetches records from ai_human_comparison table where changed = true
 * JOIN with support_threads_data to get customer email (user field)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TicketReviewRecord, TicketsReviewFilters } from './types'

/**
 * Fetch Tickets Review Records with pagination
 * Shows only tickets that were changed by agents (changed = true)
 * OPTIMIZED: SELECT only needed fields
 */
export async function fetchTicketsReview(
	supabase: SupabaseClient,
	filters: TicketsReviewFilters,
	options?: { limit?: number; offset?: number }
): Promise<TicketReviewRecord[]> {
	const {
		dateRange,
		categories,
		versions,
		classifications,
		agents,
		reviewStatuses,
	} = filters
	const { limit = 100, offset = 0 } = options || {}

	// Build query for ai_human_comparison with filters
	let query = supabase
		.from('ai_human_comparison')
		.select(
			`
			id,
			created_at,
			status,
			thread_id,
			full_request,
			subscription_info,
			tracking_info,
			human_reply,
			ai_reply,
			ai_reply_date,
			human_reply_date,
			comment,
			manual_comment,
			request_subtype,
			email,
			changes,
			updated_at,
			ticket_id,
			human_reply_original,
			check_count,
			changed,
			last_checked_at,
			improvement_suggestions,
			similarity_score,
			prompt_version,
			change_classification,
			review_status,
			ai_approved
		`
		)
		.eq('changed', true) // Only show changed tickets
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1)

	// Apply filters
	if (categories.length > 0) {
		query = query.in('request_subtype', categories)
	}
	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (classifications.length > 0) {
		query = query.in('change_classification', classifications)
	}
	if (agents.length > 0) {
		query = query.in('email', agents)
	}
	if (reviewStatuses.length > 0) {
		query = query.in('review_status', reviewStatuses)
	}

	const { data: tickets, error: ticketsError } = await query

	if (ticketsError) throw ticketsError
	if (!tickets || tickets.length === 0) return []

	// Get thread IDs to fetch user data from support_threads_data
	const threadIds = tickets
		.map(t => t.thread_id)
		.filter(Boolean) as string[]

	if (threadIds.length === 0) {
		// No thread_id links, return tickets without user field and customer request
		return tickets.map(t => ({ ...t, user: null, customer_request_text: null }))
	}

	// Fetch user data from support_threads_data (user field contains JSON string)
	const { data: threadsData, error: threadsError } = await supabase
		.from('support_threads_data')
		.select('thread_id, user')
		.in('thread_id', threadIds)

	if (threadsError) {
		console.error('Error fetching thread user data:', threadsError)
	}

	// Fetch customer request text from support_dialogs
	const { data: dialogsData, error: dialogsError } = await supabase
		.from('support_dialogs')
		.select('thread_id, text')
		.in('thread_id', threadIds)

	if (dialogsError) {
		console.error('Error fetching dialogs data:', dialogsError)
	}

	// Create map of thread_id -> user email
	// Parse user JSON and extract email field
	const userMap = new Map<string, string | null>()
	threadsData?.forEach(thread => {
		if (thread.thread_id && thread.user) {
			try {
				// user field is a JSON string like: {"name":"","email":"user@example.com",...}
				const userData = typeof thread.user === 'string'
					? JSON.parse(thread.user)
					: thread.user
				const email = userData?.email ?? null
				userMap.set(thread.thread_id, email)
			} catch (e) {
				// If JSON parsing fails, set null
				console.error('Error parsing user JSON:', e)
				userMap.set(thread.thread_id, null)
			}
		}
	})

	// Create map of thread_id -> customer request text
	const customerRequestMap = new Map<string, string | null>()
	dialogsData?.forEach(dialog => {
		if (dialog.thread_id && dialog.text) {
			customerRequestMap.set(dialog.thread_id, dialog.text)
		}
	})

	// Enrich tickets with user field and customer request text
	const enrichedTickets: TicketReviewRecord[] = tickets.map(ticket => ({
		...ticket,
		user: ticket.thread_id ? userMap.get(ticket.thread_id) ?? null : null,
		customer_request_text: ticket.thread_id
			? customerRequestMap.get(ticket.thread_id) ?? null
			: null,
	}))

	return enrichedTickets
}

/**
 * Fetch single ticket detail
 */
export async function fetchTicketDetail(
	supabase: SupabaseClient,
	ticketId: number
): Promise<TicketReviewRecord | null> {
	const { data: ticket, error: ticketError } = await supabase
		.from('ai_human_comparison')
		.select(`
			id,
			created_at,
			status,
			thread_id,
			full_request,
			subscription_info,
			tracking_info,
			human_reply,
			ai_reply,
			ai_reply_date,
			human_reply_date,
			comment,
			manual_comment,
			request_subtype,
			email,
			changes,
			updated_at,
			ticket_id,
			human_reply_original,
			check_count,
			changed,
			last_checked_at,
			improvement_suggestions,
			similarity_score,
			prompt_version,
			change_classification,
			review_status,
			ai_approved
		`)
		.eq('id', ticketId)
		.single()

	if (ticketError) throw ticketError
	if (!ticket) return null

	// Try to get user email from support_threads_data (user field contains JSON string)
	let userEmail: string | null = null
	let customerRequestText: string | null = null

	if (ticket.thread_id) {
		const { data: threadData } = await supabase
			.from('support_threads_data')
			.select('user')
			.eq('thread_id', ticket.thread_id)
			.limit(1)
			.single()

		// Parse user JSON and extract email field
		if (threadData?.user) {
			try {
				// user field is a JSON string like: {"name":"","email":"user@example.com",...}
				const userData = typeof threadData.user === 'string'
					? JSON.parse(threadData.user)
					: threadData.user
				userEmail = userData?.email ?? null
			} catch (e) {
				console.error('Error parsing user JSON:', e)
				userEmail = null
			}
		}

		// Try to get customer request text from support_dialogs
		const { data: dialogData } = await supabase
			.from('support_dialogs')
			.select('text')
			.eq('thread_id', ticket.thread_id)
			.limit(1)
			.single()

		if (dialogData?.text) {
			customerRequestText = dialogData.text
		}
	}

	return {
		...ticket,
		user: userEmail,
		customer_request_text: customerRequestText,
	}
}

/**
 * Fetch filter options for tickets review
 * Returns available categories, versions, classifications, agents
 */
export async function fetchTicketsReviewFilterOptions(
	supabase: SupabaseClient,
	dateRange: { from: Date; to: Date }
): Promise<{
	categories: string[]
	versions: string[]
	classifications: string[]
	agents: string[]
}> {
	const { data, error } = await supabase
		.from('ai_human_comparison')
		.select('request_subtype, prompt_version, change_classification, email')
		.eq('changed', true)
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())

	if (error) throw error

	// Extract unique values
	const categories = Array.from(
		new Set(data?.map(r => r.request_subtype).filter(Boolean))
	).sort() as string[]

	const versions = Array.from(
		new Set(data?.map(r => r.prompt_version).filter(Boolean))
	).sort() as string[]

	const classifications = Array.from(
		new Set(data?.map(r => r.change_classification).filter(Boolean))
	).sort() as string[]

	const agents = Array.from(
		new Set(data?.map(r => r.email).filter(Boolean))
	).sort() as string[]

	return {
		categories,
		versions,
		classifications,
		agents,
	}
}

/**
 * Fetch minimum created_at date from ai_human_comparison where changed = true
 * Used for "All Time" filter
 */
export async function fetchTicketsReviewMinCreatedDate(): Promise<Date> {
	// This function will be implemented in server action
	// For now, return a default date
	return new Date('2024-01-01')
}
