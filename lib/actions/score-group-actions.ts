'use server'

/**
 * Server Actions for Score Group Tickets
 *
 * Fetches tickets filtered by score group (critical, needs_work, good, excluded)
 * for a specific category, version, and optionally date range
 */

import { supabaseServer } from '@/lib/supabase/server'
import type { ScoreGroup } from '@/constants/classification-types'
import type { DateFilterMode, TicketReviewRecord } from '@/lib/supabase/types'
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
	const dateField = dateFilterMode === 'human_reply' ? 'human_reply_date' : 'created_at'

	// Get classifications for this score group
	const classifications = SCORE_GROUP_CLASSIFICATIONS[scoreGroup]

	// Build base query (using VIEW for review fields)
	let query = supabaseServer
		.from('ai_comparison_with_reviews')
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
			ai_approved,
			reviewer_name,
			requires_editing_correct,
			action_analysis_verification
		`,
			{ count: 'exact' }
		)
		.eq('request_subtype', category)
		.eq('prompt_version', version)
		.in('change_classification', classifications)
		.order(dateField, { ascending: false })
		.range(offset, offset + pageSize - 1)

	// Apply date filter if provided
	if (dates) {
		const dateRange = parseWeekRange(dates)
		if (dateRange) {
			query = query
				.gte(dateField, dateRange.from.toISOString())
				.lt(dateField, dateRange.to.toISOString())
		}
	}

	// For human_reply mode, also filter out records with no human_reply_date
	if (dateFilterMode === 'human_reply') {
		query = query.not('human_reply_date', 'is', null)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: tickets, error, count } = (await query) as {
		data: any[] | null
		error: any
		count: number | null
	}

	if (error) {
		console.error('Error fetching tickets by score group:', error)
		throw error
	}

	if (!tickets || tickets.length === 0) {
		return { data: [], total: 0 }
	}

	// Enrich with user data from support_threads_data (async-parallel)
	const threadIds = tickets
		.map((t: { thread_id?: string | null }) => t.thread_id)
		.filter(Boolean) as string[]

	const userMap = new Map<string, string | null>()
	const customerRequestMap = new Map<string, string | null>()

	if (threadIds.length > 0) {
		// Parallel fetch: threads + dialogs (async-parallel)
		const [threadsResult, dialogsResult] = await Promise.all([
			supabaseServer
				.from('support_threads_data')
				.select('thread_id, user')
				.in('thread_id', threadIds),
			supabaseServer
				.from('support_dialogs')
				.select('thread_id, text')
				.in('thread_id', threadIds),
		])

		if (threadsResult.error) {
			console.error('Error fetching thread user data:', threadsResult.error)
		}
		if (dialogsResult.error) {
			console.error('Error fetching dialogs data:', dialogsResult.error)
		}

		// Build user map (js-index-maps)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		threadsResult.data?.forEach((thread: any) => {
			if (thread.thread_id && thread.user) {
				try {
					const userData =
						typeof thread.user === 'string'
							? JSON.parse(thread.user)
							: thread.user
					const email = userData?.email ?? null
					userMap.set(thread.thread_id, email)
				} catch (e) {
					console.error('Error parsing user JSON:', e)
					userMap.set(thread.thread_id, null)
				}
			}
		})

		// Build customer request map (js-index-maps)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		dialogsResult.data?.forEach((dialog: any) => {
			if (dialog.thread_id && dialog.text) {
				customerRequestMap.set(dialog.thread_id, dialog.text)
			}
		})
	}

	// Enrich tickets with thread data (js-combine-iterations)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const enrichedTickets: TicketReviewRecord[] = tickets.map((ticket: any) => ({
		...ticket,
		// Coerce review fields from VIEW
		review_status: ticket.review_status ?? null,
		ai_approved: ticket.ai_approved ?? null,
		reviewer_name: ticket.reviewer_name ?? null,
		manual_comment: ticket.manual_comment ?? null,
		requires_editing_correct: ticket.requires_editing_correct ?? null,
		action_analysis_verification: ticket.action_analysis_verification ?? null,
		// Thread enrichment
		user: ticket.thread_id ? userMap.get(ticket.thread_id) ?? null : null,
		customer_request_text: ticket.thread_id
			? customerRequestMap.get(ticket.thread_id) ?? null
			: null,
	}))

	return { data: enrichedTickets, total: count ?? 0 }
}
