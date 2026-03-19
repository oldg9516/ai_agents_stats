/**
 * Tickets Review Database Queries (Drizzle)
 *
 * Replaces Supabase direct table queries with Drizzle query builder.
 * Fetches records from ai_comparison_with_reviews VIEW (LEFT JOIN ticket_reviews).
 * Review fields come from the VIEW (LEFT JOIN ticket_reviews).
 * Enriched with data from support_threads_data and support_dialogs.
 *
 * No batch fetching needed — direct pg has no row limit.
 */

import { db } from './index'
import {
	sql,
	and,
	gte,
	lt,
	eq,
	ne,
	gt,
	inArray,
	isNotNull,
	ilike,
	or,
	desc,
	asc,
	count,
} from 'drizzle-orm'
import {
	aiHumanComparison,
	aiComparisonWithReviews,
	ticketReviews,
	supportThreadsData,
	supportDialogs,
} from './schema'
import type {
	ActionAnalysis,
	ActionAnalysisVerification,
	AIHumanComparisonRow,
	TicketReviewRecord,
	TicketsReviewFilters,
} from './types'

/**
 * Fetch Tickets Review Records with pagination
 * Shows only reviewed tickets (change_classification IS NOT NULL)
 * Uses ai_comparison_with_reviews VIEW for direct review field filtering
 * Parallel fetches for enrichment data
 */
export async function fetchTicketsReview(
	filters: TicketsReviewFilters,
	options?: { limit?: number; offset?: number }
): Promise<TicketReviewRecord[]> {
	const {
		dateRange,
		ticketId,
		searchQuery,
		categories,
		versions,
		classifications,
		agents,
		reviewStatuses,
		reviewerNames,
	} = filters
	const { limit = 100, offset = 0 } = options || {}

	// Build WHERE conditions for the VIEW query
	// Using raw SQL for complex VIEW queries with dynamic OR filters
	const conditions: string[] = [
		`created_at >= '${dateRange.from.toISOString()}'::timestamptz`,
		`created_at < '${dateRange.to.toISOString()}'::timestamptz`,
		`change_classification IS NOT NULL`,
		`email != 'api@levhaolam.com'`,
	]

	if (categories.length > 0) {
		const escaped = categories.map((c) => `'${c.replace(/'/g, "''")}'`).join(',')
		conditions.push(`request_subtype IN (${escaped})`)
	}
	if (versions.length > 0) {
		const escaped = versions.map((v) => `'${v.replace(/'/g, "''")}'`).join(',')
		conditions.push(`prompt_version IN (${escaped})`)
	}
	if (classifications.length > 0) {
		const escaped = classifications.map((c) => `'${c.replace(/'/g, "''")}'`).join(',')
		conditions.push(`change_classification IN (${escaped})`)
	}
	if (agents.length > 0) {
		const escaped = agents.map((a) => `'${a.replace(/'/g, "''")}'`).join(',')
		conditions.push(`email IN (${escaped})`)
	}

	// ID filter — exact match
	if (ticketId != null) {
		conditions.push(`id = ${Number(ticketId)}`)
	}

	// Text search — server-side across multiple fields
	if (searchQuery && searchQuery.trim()) {
		const q = searchQuery.trim().replace(/'/g, "''")
		const orParts = [
			`thread_id ILIKE '%${q}%'`,
			`ticket_id ILIKE '%${q}%'`,
			`email ILIKE '%${q}%'`,
			`request_subtype ILIKE '%${q}%'`,
			`change_classification ILIKE '%${q}%'`,
			`reviewer_name ILIKE '%${q}%'`,
		]
		const numId = parseInt(q, 10)
		if (!isNaN(numId) && String(numId) === q) {
			orParts.push(`id = ${numId}`)
		}
		conditions.push(`(${orParts.join(' OR ')})`)
	}

	// Review filters — direct on VIEW columns
	if (reviewStatuses.length > 0) {
		const escaped = reviewStatuses.map((s) => `'${s.replace(/'/g, "''")}'`).join(',')
		conditions.push(`review_status IN (${escaped})`)
	}
	if (reviewerNames.length > 0) {
		const escaped = reviewerNames.map((n) => `'${n.replace(/'/g, "''")}'`).join(',')
		conditions.push(`reviewer_name IN (${escaped})`)
	}

	const whereClause = conditions.join(' AND ')

	const tickets = await db.execute(sql.raw(`
		SELECT
			id, created_at, status, thread_id, full_request, subscription_info,
			tracking_info, human_reply, ai_reply, ai_reply_date, human_reply_date,
			comment, manual_comment, request_subtype, email, changes, updated_at,
			ticket_id, human_reply_original, check_count, changed, last_checked_at,
			improvement_suggestions, similarity_score, prompt_version,
			change_classification, review_status, ai_approved, reviewer_name,
			requires_editing_correct, action_analysis_verification
		FROM ai_comparison_with_reviews
		WHERE ${whereClause}
		ORDER BY created_at DESC
		LIMIT ${limit} OFFSET ${offset}
	`))

	if (!tickets.rows || tickets.rows.length === 0) return []

	// Parallel fetch: support_threads_data + support_dialogs
	// Review fields already come from the VIEW
	const threadIds = tickets.rows
		.map((t: any) => t.thread_id)
		.filter(Boolean) as string[]

	const [threadsResult, dialogsResult] = await Promise.all([
		threadIds.length > 0
			? db
					.select({
						threadId: supportThreadsData.threadId,
						user: supportThreadsData.user,
						requestSubSubtype: supportThreadsData.requestSubSubtype,
						requiresEditing: supportThreadsData.requiresEditing,
						actionAnalysis: supportThreadsData.actionAnalysis,
					})
					.from(supportThreadsData)
					.where(inArray(supportThreadsData.threadId, threadIds))
			: Promise.resolve([]),
		threadIds.length > 0
			? db
					.select({
						threadId: supportDialogs.threadId,
						text: supportDialogs.text,
					})
					.from(supportDialogs)
					.where(inArray(supportDialogs.threadId, threadIds))
			: Promise.resolve([]),
	])

	// Build maps for O(1) lookups
	const userMap = new Map<string, string | null>()
	const subSubTypeMap = new Map<string, string | null>()
	const requiresEditingMap = new Map<string, boolean | null>()
	const actionAnalysisMap = new Map<string, ActionAnalysis | null>()

	for (const thread of threadsResult) {
		if (thread.threadId) {
			if (thread.user) {
				try {
					const userData =
						typeof thread.user === 'string'
							? JSON.parse(thread.user)
							: thread.user
					userMap.set(thread.threadId, userData?.email ?? null)
				} catch (e) {
					console.error('Error parsing user JSON:', e)
					userMap.set(thread.threadId, null)
				}
			}
			if (thread.requestSubSubtype) {
				subSubTypeMap.set(thread.threadId, thread.requestSubSubtype)
			}
			requiresEditingMap.set(
				thread.threadId,
				thread.requiresEditing ?? null
			)
			if (thread.actionAnalysis) {
				try {
					const parsed =
						typeof thread.actionAnalysis === 'string'
							? JSON.parse(thread.actionAnalysis)
							: thread.actionAnalysis
					actionAnalysisMap.set(thread.threadId, parsed)
				} catch (e) {
					console.error('Error parsing action_analysis JSON:', e)
					actionAnalysisMap.set(thread.threadId, null)
				}
			}
		}
	}

	const customerRequestMap = new Map<string, string | null>()
	for (const dialog of dialogsResult) {
		if (dialog.threadId && dialog.text) {
			customerRequestMap.set(dialog.threadId, dialog.text)
		}
	}

	// Enrich tickets with thread data
	const enrichedTickets: TicketReviewRecord[] = tickets.rows.map(
		(ticket: any) => ({
			...ticket,
			// Coerce review fields from VIEW
			review_status:
				(ticket.review_status as 'processed' | 'unprocessed') ?? null,
			ai_approved: ticket.ai_approved ?? null,
			reviewer_name: ticket.reviewer_name ?? null,
			manual_comment: ticket.manual_comment ?? null,
			requires_editing_correct:
				ticket.requires_editing_correct ?? null,
			action_analysis_verification:
				typeof ticket.action_analysis_verification === 'string'
					? JSON.parse(ticket.action_analysis_verification)
					: ticket.action_analysis_verification ?? null,
			// Thread fields
			user: ticket.thread_id
				? (userMap.get(ticket.thread_id) ?? null)
				: null,
			request_sub_subtype: ticket.thread_id
				? (subSubTypeMap.get(ticket.thread_id) ?? null)
				: null,
			requires_editing: ticket.thread_id
				? (requiresEditingMap.get(ticket.thread_id) ?? null)
				: null,
			action_analysis: ticket.thread_id
				? (actionAnalysisMap.get(ticket.thread_id) ?? null)
				: null,
			customer_request_text: ticket.thread_id
				? (customerRequestMap.get(ticket.thread_id) ?? null)
				: null,
		})
	)

	return enrichedTickets
}

/**
 * Fetch single ticket detail
 * Parallel fetches for review, thread, and dialog data
 */
export async function fetchTicketDetail(
	ticketId: number
): Promise<TicketReviewRecord | null> {
	const [ticket] = await db
		.select({
			id: aiHumanComparison.id,
			createdAt: aiHumanComparison.createdAt,
			status: aiHumanComparison.status,
			threadId: aiHumanComparison.threadId,
			fullRequest: aiHumanComparison.fullRequest,
			subscriptionInfo: aiHumanComparison.subscriptionInfo,
			trackingInfo: aiHumanComparison.trackingInfo,
			humanReply: aiHumanComparison.humanReply,
			aiReply: aiHumanComparison.aiReply,
			aiReplyDate: aiHumanComparison.aiReplyDate,
			humanReplyDate: aiHumanComparison.humanReplyDate,
			comment: aiHumanComparison.comment,
			requestSubtype: aiHumanComparison.requestSubtype,
			email: aiHumanComparison.email,
			changes: aiHumanComparison.changes,
			updatedAt: aiHumanComparison.updatedAt,
			ticketId: aiHumanComparison.ticketId,
			humanReplyOriginal: aiHumanComparison.humanReplyOriginal,
			checkCount: aiHumanComparison.checkCount,
			changed: aiHumanComparison.changed,
			lastCheckedAt: aiHumanComparison.lastCheckedAt,
			improvementSuggestions: aiHumanComparison.improvementSuggestions,
			similarityScore: aiHumanComparison.similarityScore,
			promptVersion: aiHumanComparison.promptVersion,
			changeClassification: aiHumanComparison.changeClassification,
		})
		.from(aiHumanComparison)
		.where(eq(aiHumanComparison.id, ticketId))
		.limit(1)

	if (!ticket) return null

	// Parallel fetch: review + thread + dialog data
	const [reviewRows, threadRows, dialogRows] = await Promise.all([
		db
			.select({
				reviewStatus: ticketReviews.reviewStatus,
				aiApproved: ticketReviews.aiApproved,
				reviewerName: ticketReviews.reviewerName,
				manualComment: ticketReviews.manualComment,
				requiresEditingCorrect: ticketReviews.requiresEditingCorrect,
				actionAnalysisVerification:
					ticketReviews.actionAnalysisVerification,
			})
			.from(ticketReviews)
			.where(eq(ticketReviews.comparisonId, ticketId))
			.limit(1),
		ticket.threadId
			? db
					.select({
						user: supportThreadsData.user,
						requestSubSubtype: supportThreadsData.requestSubSubtype,
						requiresEditing: supportThreadsData.requiresEditing,
						actionAnalysis: supportThreadsData.actionAnalysis,
					})
					.from(supportThreadsData)
					.where(eq(supportThreadsData.threadId, ticket.threadId))
					.limit(1)
			: Promise.resolve([]),
		ticket.threadId
			? db
					.select({ text: supportDialogs.text })
					.from(supportDialogs)
					.where(eq(supportDialogs.threadId, ticket.threadId))
					.limit(1)
			: Promise.resolve([]),
	])

	// Parse thread data
	let userEmail: string | null = null
	let requestSubSubtype: string | null = null
	let requiresEditing: boolean | null = null
	let actionAnalysis: ActionAnalysis | null = null

	const threadData = threadRows[0]
	if (threadData) {
		if (threadData.user) {
			try {
				const userData =
					typeof threadData.user === 'string'
						? JSON.parse(threadData.user)
						: threadData.user
				userEmail = userData?.email ?? null
			} catch (e) {
				console.error('Error parsing user JSON:', e)
			}
		}
		requestSubSubtype = threadData.requestSubSubtype ?? null
		requiresEditing = threadData.requiresEditing ?? null
		if (threadData.actionAnalysis) {
			try {
				actionAnalysis =
					typeof threadData.actionAnalysis === 'string'
						? JSON.parse(threadData.actionAnalysis)
						: threadData.actionAnalysis
			} catch (e) {
				console.error('Error parsing action_analysis JSON:', e)
			}
		}
	}

	const reviewData = reviewRows[0]

	// Map drizzle camelCase back to snake_case for TicketReviewRecord compatibility
	return {
		id: ticket.id,
		created_at: ticket.createdAt?.toISOString() ?? null,
		status: ticket.status,
		thread_id: ticket.threadId,
		full_request: ticket.fullRequest,
		subscription_info: ticket.subscriptionInfo,
		tracking_info: ticket.trackingInfo,
		human_reply: ticket.humanReply,
		ai_reply: ticket.aiReply,
		ai_reply_date: ticket.aiReplyDate?.toISOString() ?? null,
		human_reply_date: ticket.humanReplyDate?.toISOString() ?? null,
		comment: ticket.comment,
		manual_comment: (reviewData?.manualComment as string) ?? null,
		request_subtype: ticket.requestSubtype,
		email: ticket.email,
		changes: ticket.changes,
		updated_at: ticket.updatedAt?.toISOString() ?? null,
		ticket_id: ticket.ticketId,
		human_reply_original: ticket.humanReplyOriginal,
		check_count: ticket.checkCount,
		changed: ticket.changed,
		last_checked_at: ticket.lastCheckedAt?.toISOString() ?? null,
		improvement_suggestions: ticket.improvementSuggestions,
		similarity_score: ticket.similarityScore,
		prompt_version: ticket.promptVersion,
		change_classification: ticket.changeClassification as AIHumanComparisonRow['change_classification'],
		// Review fields from ticket_reviews
		review_status:
			(reviewData?.reviewStatus as 'processed' | 'unprocessed') ?? null,
		ai_approved: reviewData?.aiApproved ?? null,
		reviewer_name: reviewData?.reviewerName ?? null,
		requires_editing_correct: reviewData?.requiresEditingCorrect ?? null,
		action_analysis_verification:
			(reviewData?.actionAnalysisVerification as ActionAnalysisVerification) ??
			null,
		// Thread fields
		user: userEmail,
		request_sub_subtype: requestSubSubtype,
		requires_editing: requiresEditing,
		action_analysis: actionAnalysis,
		customer_request_text: dialogRows[0]?.text ?? null,
	}
}

/**
 * Fetch filter options for tickets review
 * Returns available categories, versions, classifications, agents
 */
export async function fetchTicketsReviewFilterOptions(
	dateRange: { from: Date; to: Date }
): Promise<{
	categories: string[]
	versions: string[]
	classifications: string[]
	agents: string[]
}> {
	const data = await db
		.select({
			requestSubtype: aiHumanComparison.requestSubtype,
			promptVersion: aiHumanComparison.promptVersion,
			changeClassification: aiHumanComparison.changeClassification,
			email: aiHumanComparison.email,
		})
		.from(aiHumanComparison)
		.where(
			and(
				gte(aiHumanComparison.createdAt, dateRange.from),
				lt(aiHumanComparison.createdAt, dateRange.to),
				isNotNull(aiHumanComparison.changeClassification),
				ne(aiHumanComparison.email, 'api@levhaolam.com')
			)
		)

	// Extract unique values
	const categories = Array.from(
		new Set(data.map((r) => r.requestSubtype).filter(Boolean))
	).sort() as string[]

	const versions = Array.from(
		new Set(data.map((r) => r.promptVersion).filter(Boolean))
	).sort() as string[]

	const classifications = Array.from(
		new Set(data.map((r) => r.changeClassification).filter(Boolean))
	).sort() as string[]

	const agents = Array.from(
		new Set(data.map((r) => r.email).filter(Boolean))
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
	const rows = await db
		.select({ createdAt: aiHumanComparison.createdAt })
		.from(aiHumanComparison)
		.where(isNotNull(aiHumanComparison.changeClassification))
		.orderBy(asc(aiHumanComparison.createdAt))
		.limit(1)

	return rows[0]?.createdAt ?? new Date('2024-01-01')
}

/**
 * Fetch adjacent ticket IDs for navigation
 * Returns prev and next ticket IDs based on created_at order (desc)
 */
export async function fetchAdjacentTicketIds(
	ticketId: number
): Promise<{ prevId: number | null; nextId: number | null }> {
	// Get the current ticket's created_at
	const [currentTicket] = await db
		.select({ createdAt: aiHumanComparison.createdAt })
		.from(aiHumanComparison)
		.where(eq(aiHumanComparison.id, ticketId))
		.limit(1)

	if (!currentTicket?.createdAt) {
		return { prevId: null, nextId: null }
	}

	const currentCreatedAt = currentTicket.createdAt

	// Parallel: prev (newer) + next (older)
	const [prevRows, nextRows] = await Promise.all([
		// Previous ticket (newer, created_at > current, order asc, limit 1)
		db
			.select({ id: aiHumanComparison.id })
			.from(aiHumanComparison)
			.where(
				and(
					isNotNull(aiHumanComparison.changeClassification),
					ne(aiHumanComparison.email, 'api@levhaolam.com'),
					gt(aiHumanComparison.createdAt, currentCreatedAt)
				)
			)
			.orderBy(asc(aiHumanComparison.createdAt))
			.limit(1),
		// Next ticket (older, created_at < current, order desc, limit 1)
		db
			.select({ id: aiHumanComparison.id })
			.from(aiHumanComparison)
			.where(
				and(
					isNotNull(aiHumanComparison.changeClassification),
					ne(aiHumanComparison.email, 'api@levhaolam.com'),
					lt(aiHumanComparison.createdAt, currentCreatedAt)
				)
			)
			.orderBy(desc(aiHumanComparison.createdAt))
			.limit(1),
	])

	return {
		prevId: prevRows[0]?.id ?? null,
		nextId: nextRows[0]?.id ?? null,
	}
}
