'use server'

/**
 * Server Actions for Score Group Tickets
 *
 * Fetches tickets filtered by score group (critical, needs_work, good, excluded)
 * for a specific category, version, and optionally date range
 */

import { db } from '@/lib/db'
import { aiComparisonWithReviews, supportThreadsData, supportDialogs } from '@/lib/db/schema'
import { and, eq, gte, lt, inArray, isNotNull, desc, count } from 'drizzle-orm'
import type { ScoreGroup } from '@/constants/classification-types'
import type { DateFilterMode, TicketReviewRecord } from '@/lib/db/types'
import { parse } from 'date-fns'

/**
 * Map score groups to their classification types
 * Includes both new and legacy classification types for backwards compatibility
 *
 * Mapping based on detailed-stats-actions.ts countAllClassifications():
 * - critical = criticalFactErrors + majorFunctionalOmissions
 *   = (CRITICAL_FACT_ERROR + critical_error) + MAJOR_FUNCTIONAL_OMISSION
 * - needs_work = minorInfoGaps + confusingVerbosity + tonalMisalignments + structuralFixes
 *   = (MINOR_INFO_GAP + meaningful_improvement) + CONFUSING_VERBOSITY + TONAL_MISALIGNMENT + STRUCTURAL_FIX
 * - good = stylisticEdits + perfectMatches
 *   = (STYLISTIC_EDIT + stylistic_preference) + (PERFECT_MATCH + no_significant_change)
 * - excluded = exclWorkflowShifts + exclDataDiscrepancies
 *   = (EXCL_WORKFLOW_SHIFT + context_shift) + EXCL_DATA_DISCREPANCY
 */
const SCORE_GROUP_CLASSIFICATIONS: Record<ScoreGroup, string[]> = {
	critical: [
		'CRITICAL_FACT_ERROR',
		'MAJOR_FUNCTIONAL_OMISSION',
		'critical_error', // legacy
	],
	needs_work: [
		'MINOR_INFO_GAP',
		'CONFUSING_VERBOSITY',
		'TONAL_MISALIGNMENT',
		'STRUCTURAL_FIX',
		'meaningful_improvement', // legacy
	],
	good: [
		'STYLISTIC_EDIT',
		'PERFECT_MATCH',
		'stylistic_preference', // legacy
		'no_significant_change', // legacy
	],
	excluded: [
		'EXCL_WORKFLOW_SHIFT',
		'EXCL_DATA_DISCREPANCY',
		'context_shift', // legacy
	],
}

/**
 * Parse week range string to Date objects
 * Supports formats:
 * - "Dec 16 - Dec 22" or "Dec 30 - Jan 05" (English month names)
 * - "01.12.2025 — 07.12.2025" (DD.MM.YYYY with em dash)
 */
function parseWeekRange(dateStr: string): { from: Date; to: Date } | null {
	try {
		// Try format: "01.12.2025 — 07.12.2025" (DD.MM.YYYY)
		const ddmmyyyyMatch = dateStr.match(
			/^(\d{2})\.(\d{2})\.(\d{4})\s*[—-]\s*(\d{2})\.(\d{2})\.(\d{4})$/
		)
		if (ddmmyyyyMatch) {
			const [, startDay, startMonth, startYear, endDay, endMonth, endYear] =
				ddmmyyyyMatch

			const fromDate = new Date(
				parseInt(startYear),
				parseInt(startMonth) - 1,
				parseInt(startDay),
				0,
				0,
				0,
				0
			)
			const toDate = new Date(
				parseInt(endYear),
				parseInt(endMonth) - 1,
				parseInt(endDay),
				23,
				59,
				59,
				999
			)

			return { from: fromDate, to: toDate }
		}

		// Try format: "Dec 16 - Dec 22" or "Dec 30 - Jan 05"
		const match = dateStr.match(/^(\w+)\s+(\d+)\s*-\s*(\w+)\s+(\d+)$/)
		if (!match) return null

		const [, startMonth, startDay, endMonth, endDay] = match

		// Get current year for parsing
		const currentYear = new Date().getFullYear()

		// Parse start date
		const fromDate = parse(
			`${startMonth} ${startDay} ${currentYear}`,
			'MMM d yyyy',
			new Date()
		)

		// Parse end date - might be next year if crossing year boundary
		let toDate = parse(
			`${endMonth} ${endDay} ${currentYear}`,
			'MMM d yyyy',
			new Date()
		)

		// If end date is before start date, it's crossing year boundary
		if (toDate < fromDate) {
			toDate = parse(
				`${endMonth} ${endDay} ${currentYear + 1}`,
				'MMM d yyyy',
				new Date()
			)
		}

		// Set time boundaries
		fromDate.setHours(0, 0, 0, 0)
		toDate.setHours(23, 59, 59, 999)

		return { from: fromDate, to: toDate }
	} catch (e) {
		console.error('Error parsing week range:', e)
		return null
	}
}

/**
 * Fetch tickets by score group
 *
 * @param category - Category (request_subtype)
 * @param version - Prompt version
 * @param dates - Week range string (e.g., "Dec 16 - Dec 22") or null for all dates
 * @param scoreGroup - Score group to filter by
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 * @param pagination - Pagination options
 */
export async function fetchTicketsByScoreGroup(
	category: string,
	version: string,
	dates: string | null,
	scoreGroup: ScoreGroup,
	dateFilterMode: DateFilterMode,
	pagination: { page: number; pageSize: number }
): Promise<{ data: TicketReviewRecord[]; total: number }> {
	const { page, pageSize } = pagination
	const offset = page * pageSize

	// Determine which date field to use based on mode
	const dateColumn = dateFilterMode === 'human_reply' ? aiComparisonWithReviews.humanReplyDate : aiComparisonWithReviews.createdAt

	// Get classifications for this score group
	const classifications = SCORE_GROUP_CLASSIFICATIONS[scoreGroup]

	// Build conditions
	const conditions = [
		eq(aiComparisonWithReviews.requestSubtype, category),
		eq(aiComparisonWithReviews.promptVersion, version),
		inArray(aiComparisonWithReviews.changeClassification, classifications),
	]

	// Apply date filter if provided
	if (dates) {
		const dateRange = parseWeekRange(dates)
		if (dateRange) {
			conditions.push(gte(dateColumn, dateRange.from))
			conditions.push(lt(dateColumn, dateRange.to))
		}
	}

	// For human_reply mode, also filter out records with no human_reply_date
	if (dateFilterMode === 'human_reply') {
		conditions.push(isNotNull(aiComparisonWithReviews.humanReplyDate))
	}

	const whereClause = and(...conditions)

	const [tickets, countResult] = await Promise.all([
		db
			.select({
				id: aiComparisonWithReviews.id,
				createdAt: aiComparisonWithReviews.createdAt,
				status: aiComparisonWithReviews.status,
				threadId: aiComparisonWithReviews.threadId,
				fullRequest: aiComparisonWithReviews.fullRequest,
				subscriptionInfo: aiComparisonWithReviews.subscriptionInfo,
				trackingInfo: aiComparisonWithReviews.trackingInfo,
				humanReply: aiComparisonWithReviews.humanReply,
				aiReply: aiComparisonWithReviews.aiReply,
				aiReplyDate: aiComparisonWithReviews.aiReplyDate,
				humanReplyDate: aiComparisonWithReviews.humanReplyDate,
				comment: aiComparisonWithReviews.comment,
				manualComment: aiComparisonWithReviews.manualComment,
				requestSubtype: aiComparisonWithReviews.requestSubtype,
				email: aiComparisonWithReviews.email,
				changes: aiComparisonWithReviews.changes,
				updatedAt: aiComparisonWithReviews.updatedAt,
				ticketId: aiComparisonWithReviews.ticketId,
				humanReplyOriginal: aiComparisonWithReviews.humanReplyOriginal,
				checkCount: aiComparisonWithReviews.checkCount,
				changed: aiComparisonWithReviews.changed,
				lastCheckedAt: aiComparisonWithReviews.lastCheckedAt,
				improvementSuggestions: aiComparisonWithReviews.improvementSuggestions,
				similarityScore: aiComparisonWithReviews.similarityScore,
				promptVersion: aiComparisonWithReviews.promptVersion,
				changeClassification: aiComparisonWithReviews.changeClassification,
				reviewStatus: aiComparisonWithReviews.reviewStatus,
				aiApproved: aiComparisonWithReviews.aiApproved,
				reviewerName: aiComparisonWithReviews.reviewerName,
				requiresEditingCorrect: aiComparisonWithReviews.requiresEditingCorrect,
				actionAnalysisVerification: aiComparisonWithReviews.actionAnalysisVerification,
			})
			.from(aiComparisonWithReviews)
			.where(whereClause)
			.orderBy(desc(dateColumn))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ value: count() })
			.from(aiComparisonWithReviews)
			.where(whereClause),
	])

	if (!tickets || tickets.length === 0) {
		return { data: [], total: 0 }
	}

	// Enrich with user data from support_threads_data (async-parallel)
	const threadIds = tickets
		.map((t) => t.threadId)
		.filter(Boolean) as string[]

	const userMap = new Map<string, string | null>()
	const customerRequestMap = new Map<string, string | null>()

	if (threadIds.length > 0) {
		// Parallel fetch: threads + dialogs (async-parallel)
		const [threadsResult, dialogsResult] = await Promise.all([
			db
				.select({ threadId: supportThreadsData.threadId, user: supportThreadsData.user })
				.from(supportThreadsData)
				.where(inArray(supportThreadsData.threadId, threadIds)),
			db
				.select({ threadId: supportDialogs.threadId, text: supportDialogs.text })
				.from(supportDialogs)
				.where(inArray(supportDialogs.threadId, threadIds)),
		])

		// Build user map (js-index-maps)
		threadsResult.forEach((thread) => {
			if (thread.threadId && thread.user) {
				try {
					const userData =
						typeof thread.user === 'string'
							? JSON.parse(thread.user)
							: thread.user
					const email = userData?.email ?? null
					userMap.set(thread.threadId, email)
				} catch (e) {
					console.error('Error parsing user JSON:', e)
					userMap.set(thread.threadId, null)
				}
			}
		})

		// Build customer request map (js-index-maps)
		dialogsResult.forEach((dialog) => {
			if (dialog.threadId && dialog.text) {
				customerRequestMap.set(dialog.threadId, dialog.text)
			}
		})
	}

	// Enrich tickets with thread data — map drizzle camelCase to snake_case for TicketReviewRecord
	const enrichedTickets: TicketReviewRecord[] = tickets.map((ticket) => ({
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
		manual_comment: ticket.manualComment ?? null,
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
		change_classification: ticket.changeClassification,
		review_status: ticket.reviewStatus ?? null,
		ai_approved: ticket.aiApproved ?? null,
		reviewer_name: ticket.reviewerName ?? null,
		requires_editing_correct: ticket.requiresEditingCorrect ?? null,
		action_analysis_verification: ticket.actionAnalysisVerification ?? null,
		// Thread enrichment
		user: ticket.threadId ? userMap.get(ticket.threadId) ?? null : null,
		customer_request_text: ticket.threadId
			? customerRequestMap.get(ticket.threadId) ?? null
			: null,
	})) as TicketReviewRecord[]

	return { data: enrichedTickets, total: Number(countResult[0]?.value ?? 0) }
}
