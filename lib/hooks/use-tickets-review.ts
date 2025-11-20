'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTicketsReviewAction } from '../actions/tickets-review-actions'
import type { TicketsReviewFilters } from '../supabase/types'

/**
 * React Query hook for fetching tickets review data
 *
 * Features:
 * - Automatic caching
 * - Timeout protection (30s)
 * - Retry logic (2 attempts)
 * - Refetch on window focus
 */
export function useTicketsReview(
	filters: TicketsReviewFilters,
	pagination?: { limit: number; offset: number }
) {
	return useQuery({
		queryKey: ['tickets-review', filters, pagination],
		queryFn: async () => {
			const result = await fetchTicketsReviewAction(filters, pagination)

			if (!result.success) {
				throw new Error(result.error || 'Failed to fetch tickets review')
			}

			return result.data || []
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2,
		retryDelay: 1000,
		refetchOnWindowFocus: true,
	})
}
