'use server'

/**
 * Server Actions for Score Group Tickets
 *
 * Fetches tickets filtered by score group (critical, needs_work, good, excluded)
 * for a specific category, version, and optionally date range
 */

import { supabaseServer } from '@/lib/supabase/server'
import type { ScoreGroup } from '@/constants/classification-types'
import type { TicketReviewRecord } from '@/lib/supabase/types'
import { parse } from 'date-fns'

/**
 * Map score groups to their classification types
 */
const SCORE_GROUP_CLASSIFICATIONS: Record<ScoreGroup, string[]> = {
	critical: ['CRITICAL_FACT_ERROR', 'MAJOR_FUNCTIONAL_OMISSION'],
	needs_work: [
		'MINOR_INFO_GAP',
		'CONFUSING_VERBOSITY',
		'TONAL_MISALIGNMENT',
		'STRUCTURAL_FIX',
	],
	good: ['STYLISTIC_EDIT', 'PERFECT_MATCH'],
	excluded: ['EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY'],
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
 * @param pagination - Pagination options
 */
export async function fetchTicketsByScoreGroup(
	category: string,
	version: string,
	dates: string | null,
	scoreGroup: ScoreGroup,
	pagination: { page: number; pageSize: number }
): Promise<{ data: TicketReviewRecord[]; total: number }> {
	const { page, pageSize } = pagination
	const offset = page * pageSize

	// Get classifications for this score group
	const classifications = SCORE_GROUP_CLASSIFICATIONS[scoreGroup]

	// Build base query
	let query = supabaseServer
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
			ai_approved,
			reviewer_name
		`,
			{ count: 'exact' }
		)
		.eq('request_subtype', category)
		.eq('prompt_version', version)
		.in('change_classification', classifications)
		.order('created_at', { ascending: false })
		.range(offset, offset + pageSize - 1)

	// Apply date filter if provided
	if (dates) {
		const dateRange = parseWeekRange(dates)
		if (dateRange) {
			query = query
				.gte('created_at', dateRange.from.toISOString())
				.lt('created_at', dateRange.to.toISOString())
		}
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

	// Enrich with user data from support_threads_data
	const threadIds = tickets
		.map((t: { thread_id?: string | null }) => t.thread_id)
		.filter(Boolean) as string[]

	const userMap = new Map<string, string | null>()
	const customerRequestMap = new Map<string, string | null>()

	if (threadIds.length > 0) {
		// Fetch user data
		const { data: threadsData, error: threadsError } = await supabaseServer
			.from('support_threads_data')
			.select('thread_id, user')
			.in('thread_id', threadIds)

		if (threadsError) {
			console.error('Error fetching thread user data:', threadsError)
		}

		// Fetch customer request text
		const { data: dialogsData, error: dialogsError } = await supabaseServer
			.from('support_dialogs')
			.select('thread_id, text')
			.in('thread_id', threadIds)

		if (dialogsError) {
			console.error('Error fetching dialogs data:', dialogsError)
		}

		// Build user map
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		threadsData?.forEach((thread: any) => {
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

		// Build customer request map
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		dialogsData?.forEach((dialog: any) => {
			if (dialog.thread_id && dialog.text) {
				customerRequestMap.set(dialog.thread_id, dialog.text)
			}
		})
	}

	// Enrich tickets
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const enrichedTickets: TicketReviewRecord[] = tickets.map((ticket: any) => ({
		...ticket,
		user: ticket.thread_id ? userMap.get(ticket.thread_id) ?? null : null,
		customer_request_text: ticket.thread_id
			? customerRequestMap.get(ticket.thread_id) ?? null
			: null,
	}))

	return { data: enrichedTickets, total: count ?? 0 }
}
