/**
 * Support Thread Queries
 * Fetching thread lists, details, and category stats
 */

import { db } from '../index'
import { sql, and, gte, lt, eq, inArray, isNotNull, desc } from 'drizzle-orm'
import { supportThreadsData, aiHumanComparison, supportDialogs } from '../schema'
import type {
	RequestCategoryStats,
	SupportFilters,
	SupportThread,
} from '@/lib/db/types'

// Fields to select from support_threads_data (matching original SUPPORT_THREAD_FIELDS)
const THREAD_SELECT = {
	threadId: supportThreadsData.threadId,
	ticketId: supportThreadsData.ticketId,
	requestType: supportThreadsData.requestType,
	requestSubtype: supportThreadsData.requestSubtype,
	requiresReply: supportThreadsData.requiresReply,
	requiresIdentification: supportThreadsData.requiresIdentification,
	requiresEditing: supportThreadsData.requiresEditing,
	requiresSubscriptionInfo: supportThreadsData.requiresSubscriptionInfo,
	requiresTrackingInfo: supportThreadsData.requiresTrackingInfo,
	requiresBoxContentsInfo: supportThreadsData.requiresBoxContentsInfo,
	aiDraftReply: supportThreadsData.aiDraftReply,
	status: supportThreadsData.status,
	promptVersion: supportThreadsData.promptVersion,
	createdAt: supportThreadsData.createdAt,
	user: supportThreadsData.user,
} as const

/**
 * Check if there's a human response (direction='out') AFTER the AI thread
 * in support_dialogs table for each thread
 *
 * Optimized: O(n) instead of O(n*m) by finding max outgoing thread_id per ticket
 * No batching needed with direct pg connection
 */
async function fetchHumanResponsesMap(
	threads: { threadId: string; ticketId: string | null }[]
): Promise<Map<string, boolean>> {
	const result = new Map<string, boolean>()
	if (threads.length === 0) return result

	// Group threads by ticket_id for efficient querying
	const ticketToThreads = new Map<string, { threadId: string; ticketId: string }[]>()
	threads.forEach(t => {
		if (!t.ticketId) return
		const existing = ticketToThreads.get(t.ticketId) || []
		existing.push({ threadId: t.threadId, ticketId: t.ticketId })
		ticketToThreads.set(t.ticketId, existing)
	})

	const ticketIds = [...ticketToThreads.keys()]
	if (ticketIds.length === 0) return result

	// Single query - no batching needed with direct pg
	const outgoingDialogs = await db
		.select({
			ticketId: supportDialogs.ticketId,
			threadId: supportDialogs.threadId,
		})
		.from(supportDialogs)
		.where(
			and(
				inArray(supportDialogs.ticketId, ticketIds),
				eq(supportDialogs.direction, 'out')
			)
		)

	// Find max outgoing thread_id per ticket - O(n) single pass
	const maxOutgoingByTicket = new Map<string, bigint>()
	outgoingDialogs.forEach(dialog => {
		if (!dialog.ticketId || !dialog.threadId) return
		const dialogThreadId = BigInt(dialog.threadId)
		const currentMax = maxOutgoingByTicket.get(dialog.ticketId)
		if (currentMax === undefined || dialogThreadId > currentMax) {
			maxOutgoingByTicket.set(dialog.ticketId, dialogThreadId)
		}
	})

	// Now check each AI thread against max outgoing - O(threads) single pass
	for (const [ticketId, ticketThreads] of ticketToThreads) {
		const maxOutgoing = maxOutgoingByTicket.get(ticketId)
		if (maxOutgoing === undefined) continue

		for (const t of ticketThreads) {
			const aiThreadId = BigInt(t.threadId)
			// If max outgoing thread_id > AI thread_id, there's a human response after it
			if (maxOutgoing > aiThreadId) {
				result.set(t.threadId, true)
			}
		}
	}

	return result
}

/**
 * Build drizzle conditions array from SupportFilters
 */
function buildThreadConditions(filters: SupportFilters) {
	const {
		dateRange,
		statuses,
		requestTypes,
		categories,
		requirements,
		versions,
		pendingDraftsOnly,
		hideRequiresEditing,
	} = filters

	const conditions = [
		gte(supportThreadsData.createdAt, dateRange.from),
		lt(supportThreadsData.createdAt, dateRange.to),
	]

	if (statuses && statuses.length > 0) {
		conditions.push(inArray(supportThreadsData.status, statuses))
	}
	if (requestTypes && requestTypes.length > 0) {
		conditions.push(inArray(supportThreadsData.requestType, requestTypes))
	}
	if (categories && categories.length > 0) {
		conditions.push(inArray(supportThreadsData.requestSubtype, categories))
	}
	if (versions && versions.length > 0) {
		conditions.push(inArray(supportThreadsData.promptVersion, versions))
	}
	if (requirements && requirements.length > 0) {
		requirements.forEach(req => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fieldMap: Record<string, any> = {
				requires_reply: supportThreadsData.requiresReply,
				requires_identification: supportThreadsData.requiresIdentification,
				requires_editing: supportThreadsData.requiresEditing,
				requires_subscription_info: supportThreadsData.requiresSubscriptionInfo,
				requires_tracking_info: supportThreadsData.requiresTrackingInfo,
				requires_box_contents_info: supportThreadsData.requiresBoxContentsInfo,
			}
			const column = fieldMap[req]
			if (column) {
				conditions.push(eq(column, true))
			}
		})
	}
	if (pendingDraftsOnly) {
		conditions.push(isNotNull(supportThreadsData.aiDraftReply))
	}
	if (hideRequiresEditing) {
		conditions.push(eq(supportThreadsData.requiresEditing, false))
	}

	return conditions
}

/**
 * Helper to parse customer email from user JSON field
 */
function parseCustomerEmail(userField: unknown): string | null {
	if (!userField) return null
	try {
		const userData =
			typeof userField === 'string' ? JSON.parse(userField) : userField
		return userData?.email ?? null
	} catch {
		return null
	}
}

/**
 * Fetch Support Threads with JOIN to ai_human_comparison
 * If fetchAll is true, fetches all records (no batching needed with direct pg)
 */
export async function fetchSupportThreads(
	filters: SupportFilters,
	options?: { limit?: number; offset?: number; fetchAll?: boolean }
): Promise<SupportThread[]> {
	const { limit, offset = 0, fetchAll = false } = options || {}

	const conditions = buildThreadConditions(filters)

	// Build query
	let query = db
		.select(THREAD_SELECT)
		.from(supportThreadsData)
		.where(and(...conditions))
		.orderBy(desc(supportThreadsData.createdAt))

	// Apply pagination unless fetchAll
	if (!fetchAll) {
		const effectiveLimit = limit ?? 300
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		query = (query as any).limit(effectiveLimit).offset(offset)
	}

	const threads = await query

	if (threads.length === 0) return []

	// Get thread IDs
	const threadIds = threads.map(t => t.threadId)

	// Fetch comparison, dialog data, and human responses - single queries each (no batching)
	const [comparisonData, dialogData, humanResponseData] = await Promise.all([
		db
			.select({
				threadId: aiHumanComparison.threadId,
				changed: aiHumanComparison.changed,
				email: aiHumanComparison.email,
				humanReply: aiHumanComparison.humanReply,
			})
			.from(aiHumanComparison)
			.where(inArray(aiHumanComparison.threadId, threadIds)),
		db
			.select({
				threadId: supportDialogs.threadId,
				direction: supportDialogs.direction,
				text: supportDialogs.text,
			})
			.from(supportDialogs)
			.where(inArray(supportDialogs.threadId, threadIds)),
		fetchHumanResponsesMap(
			threads.map(t => ({ threadId: t.threadId, ticketId: t.ticketId }))
		),
	])

	// Create a map of thread_id -> comparison data
	const comparisonMap = new Map<
		string,
		{ changed: boolean | null; email: string | null; humanReply: string | null }
	>()
	comparisonData.forEach(comp => {
		if (comp.threadId) {
			comparisonMap.set(comp.threadId, {
				changed: comp.changed,
				email: comp.email,
				humanReply: comp.humanReply,
			})
		}
	})

	// Create a map of thread_id -> dialog data (direction and text)
	const dialogMap = new Map<
		string,
		{ direction: string | null; text: string | null }
	>()
	dialogData.forEach(dialog => {
		if (dialog.threadId) {
			dialogMap.set(dialog.threadId, {
				direction: dialog.direction ?? null,
				text: dialog.text ?? null,
			})
		}
	})

	// Enrich threads with comparison and dialog data
	const { pendingDraftsOnly } = filters
	let enrichedThreads: SupportThread[] = threads.map(thread => {
		const comparison = comparisonMap.get(thread.threadId)
		const dialog = dialogMap.get(thread.threadId)
		const hasHumanResponseInDialogs = humanResponseData.get(thread.threadId) ?? false

		return {
			// Map drizzle camelCase back to snake_case for SupportThread interface
			thread_id: thread.threadId,
			ticket_id: thread.ticketId ?? '',
			request_type: thread.requestType,
			request_subtype: thread.requestSubtype,
			requires_reply: thread.requiresReply ?? false,
			requires_identification: thread.requiresIdentification ?? false,
			requires_editing: thread.requiresEditing ?? false,
			requires_subscription_info: thread.requiresSubscriptionInfo ?? false,
			requires_tracking_info: thread.requiresTrackingInfo ?? false,
			requires_box_contents_info: thread.requiresBoxContentsInfo ?? false,
			ai_draft_reply: thread.aiDraftReply,
			status: thread.status ?? '',
			prompt_version: thread.promptVersion,
			created_at: thread.createdAt?.toISOString() ?? null,
			// Enriched fields
			changed: comparison?.changed ?? null,
			email: comparison?.email ?? null,
			human_reply: comparison?.humanReply ?? null,
			direction: dialog?.direction ?? null,
			customer_request_text: dialog?.text ?? null,
			customer_email: parseCustomerEmail(thread.user),
			qualityPercentage:
				comparison?.changed === false
					? 100
					: comparison?.changed === true
					? 0
					: null,
			hasHumanResponseAfterAI: hasHumanResponseInDialogs,
		}
	})

	// If pendingDraftsOnly is enabled, filter out threads that have human response
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
	threadId: string
): Promise<SupportThread | null> {
	const threadData = await db
		.select(THREAD_SELECT)
		.from(supportThreadsData)
		.where(eq(supportThreadsData.threadId, threadId))
		.limit(1)

	if (!threadData[0]) return null
	const thread = threadData[0]

	// Try to find matching comparison record by thread_id
	const comparisonData = await db
		.select({
			changed: aiHumanComparison.changed,
			email: aiHumanComparison.email,
			humanReply: aiHumanComparison.humanReply,
		})
		.from(aiHumanComparison)
		.where(eq(aiHumanComparison.threadId, threadId))
		.limit(1)

	const comparison = comparisonData[0]

	// Try to find direction and customer request text from support_dialogs
	const dialogData = await db
		.select({
			direction: supportDialogs.direction,
			text: supportDialogs.text,
		})
		.from(supportDialogs)
		.where(eq(supportDialogs.threadId, threadId))
		.limit(1)

	const dialog = dialogData[0]

	return {
		thread_id: thread.threadId,
		ticket_id: thread.ticketId ?? '',
		request_type: thread.requestType,
		request_subtype: thread.requestSubtype,
		requires_reply: thread.requiresReply ?? false,
		requires_identification: thread.requiresIdentification ?? false,
		requires_editing: thread.requiresEditing ?? false,
		requires_subscription_info: thread.requiresSubscriptionInfo ?? false,
		requires_tracking_info: thread.requiresTrackingInfo ?? false,
		requires_box_contents_info: thread.requiresBoxContentsInfo ?? false,
		ai_draft_reply: thread.aiDraftReply,
		status: thread.status ?? '',
		prompt_version: thread.promptVersion,
		created_at: thread.createdAt?.toISOString() ?? null,
		changed: comparison?.changed ?? null,
		email: comparison?.email ?? null,
		human_reply: comparison?.humanReply ?? null,
		direction: dialog?.direction ?? null,
		customer_request_text: dialog?.text ?? null,
		customer_email: parseCustomerEmail(thread.user),
		qualityPercentage:
			comparison?.changed === false
				? 100
				: comparison?.changed === true
				? 0
				: null,
	} as SupportThread
}

/**
 * Fetch Request Category Statistics
 * Shows breakdown of request_type and request_subtype with counts and percentages
 * Groups multiple subtypes (containing comma) as "multiply"
 */
export async function fetchRequestCategoryStats(
	dateRange: { from: Date; to: Date }
): Promise<RequestCategoryStats[]> {
	const result = await db.execute(sql`SELECT * FROM get_request_category_stats(
		date_from := ${dateRange.from.toISOString()}::timestamptz,
		date_to := ${dateRange.to.toISOString()}::timestamptz
	)`)

	return (result.rows || []) as unknown as RequestCategoryStats[]
}

/**
 * Fetch all unique categories (request_subtype) for filter dropdown
 * Sorted: single categories (without comma) first, then multi-categories
 * Uses RPC function for efficient DISTINCT query on database level
 */
export async function fetchAvailableCategories(
	dateRange: { from: Date; to: Date }
): Promise<string[]> {
	const result = await db.execute(sql`SELECT * FROM get_available_categories(
		date_from := ${dateRange.from.toISOString()}::timestamptz,
		date_to := ${dateRange.to.toISOString()}::timestamptz
	)`)

	// RPC returns array of { request_subtype: string }
	return (result.rows || []).map((d: Record<string, unknown>) => d.request_subtype as string)
}
