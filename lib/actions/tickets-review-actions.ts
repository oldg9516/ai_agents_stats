'use server'

/**
 * Tickets Review Server Actions
 *
 * Server-side functions using SERVICE ROLE key to bypass RLS
 */

import {
	fetchTicketsReview,
	fetchTicketsReviewFilterOptions,
} from '@/lib/supabase/queries-tickets-review'
import { supabaseServer } from '@/lib/supabase/server'
import type { TicketsReviewFilters } from '@/lib/supabase/types'

/**
 * Fetch tickets review data with pagination
 * Returns tickets where changed = true
 */
export async function fetchTicketsReviewAction(
	filters: TicketsReviewFilters,
	pagination?: { limit: number; offset: number }
) {
	try {
		const startTime = Date.now()

		const tickets = await fetchTicketsReview(
			supabaseServer,
			filters,
			pagination
		)

		const queryTime = Date.now() - startTime
		console.log(`✅ [Tickets Review] Fetched ${tickets.length} tickets in ${queryTime}ms`)

		return {
			success: true,
			data: tickets,
		}
	} catch (error) {
		console.error('❌ [Server Action] Error fetching tickets review:', error)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch tickets review',
			data: null,
		}
	}
}

/**
 * Fetch filter options for tickets review
 * Returns available categories, versions, classifications, agents
 */
export async function fetchTicketsReviewFilterOptionsAction(dateRange: {
	from: Date
	to: Date
}) {
	try {
		const options = await fetchTicketsReviewFilterOptions(
			supabaseServer,
			dateRange
		)

		return {
			success: true,
			data: options,
		}
	} catch (error) {
		console.error(
			'❌ [Server Action] Error fetching filter options:',
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch filter options',
			data: null,
		}
	}
}

/**
 * Fetch minimum created_at date from ai_human_comparison where changed = true
 * Used for "All Time" filter
 */
export async function fetchTicketsReviewMinCreatedDate(): Promise<Date> {
	try {
		const { data, error } = await supabaseServer
			.from('ai_human_comparison')
			.select('created_at')
			.eq('changed', true)
			.order('created_at', { ascending: true })
			.limit(1)
			.single<{ created_at: string }>()

		if (error) throw error
		if (!data) throw new Error('No data returned')

		return new Date(data.created_at)
	} catch (error) {
		console.error('❌ [Tickets Review MinDate] Error:', error)
		// Fallback to a safe default date
		return new Date('2024-01-01')
	}
}
