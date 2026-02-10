/**
 * Tickets Review Database Queries
 *
 * All queries for the Tickets Review section
 * Fetches records from ai_human_comparison table where change_classification IS NOT NULL (reviewed records)
 * Review fields come from ticket_reviews table (separate from ai_human_comparison)
 * Enriched with data from support_threads_data and support_dialogs
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActionAnalysis, TicketReviewRecord, TicketsReviewFilters } from './types'

/**
 * Fetch Tickets Review Records with pagination
 * Shows only reviewed tickets (change_classification IS NOT NULL)
 * OPTIMIZED: Parallel fetches (async-parallel), Map lookups (js-index-maps)
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
		reviewerNames,
	} = filters
	const { limit = 100, offset = 0 } = options || {}

	// Two-stage filter: if review filters are active, pre-fetch matching comparison_ids from ticket_reviews
	let reviewFilteredIds: number[] | null = null
	if (reviewStatuses.length > 0 || reviewerNames.length > 0) {
		let reviewQuery = supabase
			.from('ticket_reviews')
			.select('comparison_id')

		if (reviewStatuses.length > 0) {
			reviewQuery = reviewQuery.in('review_status', reviewStatuses)
		}
		if (reviewerNames.length > 0) {
			reviewQuery = reviewQuery.in('reviewer_name', reviewerNames)
		}

		const { data: reviewIds, error: reviewError } = await reviewQuery

		if (reviewError) {
			console.error('Error fetching review filter IDs:', reviewError)
		}

		reviewFilteredIds = reviewIds?.map(r => r.comparison_id) ?? []

		// Early exit if no matches
		if (reviewFilteredIds.length === 0) return []
	}

	// Build query for ai_human_comparison (without review fields)
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
			change_classification
		`
		)
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())
		.not('change_classification', 'is', null)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1)

	// Apply ai_human_comparison filters
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

	// Apply pre-fetched review filter IDs
	if (reviewFilteredIds !== null) {
		query = query.in('id', reviewFilteredIds)
	}

	// Exclude system/API emails from statistics
	query = query.neq('email', 'api@levhaolam.com')

	const { data: tickets, error: ticketsError } = await query

	if (ticketsError) throw ticketsError
	if (!tickets || tickets.length === 0) return []

	// Parallel fetch: ticket_reviews + support_threads_data + support_dialogs (async-parallel)
	const ticketIds = tickets.map(t => t.id)
	const threadIds = tickets.map(t => t.thread_id).filter(Boolean) as string[]

	const [reviewsResult, threadsResult, dialogsResult] = await Promise.all([
		supabase
			.from('ticket_reviews')
			.select('comparison_id, review_status, ai_approved, reviewer_name, manual_comment, requires_editing_correct, action_analysis_verification')
			.in('comparison_id', ticketIds),
		threadIds.length > 0
			? supabase
				.from('support_threads_data')
				.select('thread_id, user, request_sub_subtype, requires_editing, action_analysis')
				.in('thread_id', threadIds)
			: Promise.resolve({ data: null, error: null }),
		threadIds.length > 0
			? supabase
				.from('support_dialogs')
				.select('thread_id, text')
				.in('thread_id', threadIds)
			: Promise.resolve({ data: null, error: null }),
	])

	if (reviewsResult.error) {
		console.error('Error fetching reviews data:', reviewsResult.error)
	}
	if (threadsResult.error) {
		console.error('Error fetching thread user data:', threadsResult.error)
	}
	if (dialogsResult.error) {
		console.error('Error fetching dialogs data:', dialogsResult.error)
	}

	// Build maps for O(1) lookups (js-index-maps)
	type ReviewData = {
		review_status: string
		ai_approved: boolean | null
		reviewer_name: string | null
		manual_comment: string | null
		requires_editing_correct: boolean | null
		action_analysis_verification: any | null
	}
	const reviewsMap = new Map<number, ReviewData>()
	reviewsResult.data?.forEach(r => reviewsMap.set(r.comparison_id, r))

	const userMap = new Map<string, string | null>()
	const subSubTypeMap = new Map<string, string | null>()
	const requiresEditingMap = new Map<string, boolean | null>()
	const actionAnalysisMap = new Map<string, ActionAnalysis | null>()
	threadsResult.data?.forEach(thread => {
		if (thread.thread_id) {
			// Parse user data
			if (thread.user) {
				try {
					const userData = typeof thread.user === 'string'
						? JSON.parse(thread.user)
						: thread.user
					userMap.set(thread.thread_id, userData?.email ?? null)
				} catch (e) {
					console.error('Error parsing user JSON:', e)
					userMap.set(thread.thread_id, null)
				}
			}
			if (thread.request_sub_subtype) {
				subSubTypeMap.set(thread.thread_id, thread.request_sub_subtype)
			}
			requiresEditingMap.set(thread.thread_id, thread.requires_editing ?? null)
			if (thread.action_analysis) {
				try {
					const parsed = typeof thread.action_analysis === 'string'
						? JSON.parse(thread.action_analysis)
						: thread.action_analysis
					actionAnalysisMap.set(thread.thread_id, parsed)
				} catch (e) {
					console.error('Error parsing action_analysis JSON:', e)
					actionAnalysisMap.set(thread.thread_id, null)
				}
			}
		}
	})

	const customerRequestMap = new Map<string, string | null>()
	dialogsResult.data?.forEach(dialog => {
		if (dialog.thread_id && dialog.text) {
			customerRequestMap.set(dialog.thread_id, dialog.text)
		}
	})

	// Enrich tickets in single pass (js-combine-iterations)
	const enrichedTickets: TicketReviewRecord[] = tickets.map(ticket => {
		const review = reviewsMap.get(ticket.id)
		return {
			...ticket,
			// Review fields from ticket_reviews
			review_status: (review?.review_status as 'processed' | 'unprocessed') ?? null,
			ai_approved: review?.ai_approved ?? null,
			reviewer_name: review?.reviewer_name ?? null,
			manual_comment: review?.manual_comment ?? null,
			requires_editing_correct: review?.requires_editing_correct ?? null,
			action_analysis_verification: review?.action_analysis_verification ?? null,
			// Thread fields
			user: ticket.thread_id ? userMap.get(ticket.thread_id) ?? null : null,
			request_sub_subtype: ticket.thread_id ? subSubTypeMap.get(ticket.thread_id) ?? null : null,
			requires_editing: ticket.thread_id ? requiresEditingMap.get(ticket.thread_id) ?? null : null,
			action_analysis: ticket.thread_id ? actionAnalysisMap.get(ticket.thread_id) ?? null : null,
			customer_request_text: ticket.thread_id ? customerRequestMap.get(ticket.thread_id) ?? null : null,
		}
	})

	return enrichedTickets
}

/**
 * Fetch single ticket detail
 * OPTIMIZED: Parallel fetches for review, thread, and dialog data (async-parallel)
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
			change_classification
		`)
		.eq('id', ticketId)
		.single()

	if (ticketError) throw ticketError
	if (!ticket) return null

	// Parallel fetch: review + thread + dialog data (async-parallel)
	const [reviewResult, threadResult, dialogResult] = await Promise.all([
		supabase
			.from('ticket_reviews')
			.select('review_status, ai_approved, reviewer_name, manual_comment, requires_editing_correct, action_analysis_verification')
			.eq('comparison_id', ticketId)
			.maybeSingle(),
		ticket.thread_id
			? supabase
				.from('support_threads_data')
				.select('user, request_sub_subtype, requires_editing, action_analysis')
				.eq('thread_id', ticket.thread_id)
				.limit(1)
				.single()
			: Promise.resolve({ data: null, error: null }),
		ticket.thread_id
			? supabase
				.from('support_dialogs')
				.select('text')
				.eq('thread_id', ticket.thread_id)
				.limit(1)
				.single()
			: Promise.resolve({ data: null, error: null }),
	])

	// Parse thread data
	let userEmail: string | null = null
	let requestSubSubtype: string | null = null
	let requiresEditing: boolean | null = null
	let actionAnalysis: ActionAnalysis | null = null

	if (threadResult.data) {
		const threadData = threadResult.data
		if (threadData.user) {
			try {
				const userData = typeof threadData.user === 'string'
					? JSON.parse(threadData.user)
					: threadData.user
				userEmail = userData?.email ?? null
			} catch (e) {
				console.error('Error parsing user JSON:', e)
			}
		}
		requestSubSubtype = threadData.request_sub_subtype ?? null
		requiresEditing = threadData.requires_editing ?? null
		if (threadData.action_analysis) {
			try {
				actionAnalysis = typeof threadData.action_analysis === 'string'
					? JSON.parse(threadData.action_analysis)
					: threadData.action_analysis
			} catch (e) {
				console.error('Error parsing action_analysis JSON:', e)
			}
		}
	}

	const reviewData = reviewResult.data

	return {
		...ticket,
		// Review fields from ticket_reviews
		review_status: (reviewData?.review_status as 'processed' | 'unprocessed') ?? null,
		ai_approved: reviewData?.ai_approved ?? null,
		reviewer_name: reviewData?.reviewer_name ?? null,
		manual_comment: reviewData?.manual_comment ?? null,
		requires_editing_correct: reviewData?.requires_editing_correct ?? null,
		action_analysis_verification: reviewData?.action_analysis_verification ?? null,
		// Thread fields
		user: userEmail,
		request_sub_subtype: requestSubSubtype,
		requires_editing: requiresEditing,
		action_analysis: actionAnalysis,
		customer_request_text: dialogResult.data?.text ?? null,
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
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())
		.not('change_classification', 'is', null)
		.neq('email', 'api@levhaolam.com') // Exclude system/API emails

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
 * Fetch minimum created_at date from ai_human_comparison where change_classification IS NOT NULL
 * Used for "All Time" filter
 */
export async function fetchTicketsReviewMinCreatedDate(): Promise<Date> {
	// This function will be implemented in server action
	// For now, return a default date
	return new Date('2024-01-01')
}

/**
 * Fetch adjacent ticket IDs for navigation
 * Returns prev and next ticket IDs based on created_at order (desc)
 */
export async function fetchAdjacentTicketIds(
	supabase: SupabaseClient,
	ticketId: number
): Promise<{ prevId: number | null; nextId: number | null }> {
	// First, get the current ticket's created_at
	const { data: currentTicket, error: currentError } = await supabase
		.from('ai_human_comparison')
		.select('created_at')
		.eq('id', ticketId)
		.single()

	if (currentError || !currentTicket) {
		return { prevId: null, nextId: null }
	}

	const currentCreatedAt = currentTicket.created_at

	// Get previous ticket (newer, so created_at > current, order asc, limit 1)
	const { data: prevTicket } = await supabase
		.from('ai_human_comparison')
		.select('id')
		.not('change_classification', 'is', null)
		.neq('email', 'api@levhaolam.com') // Exclude system/API emails
		.gt('created_at', currentCreatedAt)
		.order('created_at', { ascending: true })
		.limit(1)
		.single()

	// Get next ticket (older, so created_at < current, order desc, limit 1)
	const { data: nextTicket } = await supabase
		.from('ai_human_comparison')
		.select('id')
		.not('change_classification', 'is', null)
		.neq('email', 'api@levhaolam.com') // Exclude system/API emails
		.lt('created_at', currentCreatedAt)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()

	return {
		prevId: prevTicket?.id ?? null,
		nextId: nextTicket?.id ?? null,
	}
}
