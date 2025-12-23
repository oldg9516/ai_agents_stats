'use client'

/**
 * React Query hooks for Score Group Tickets
 *
 * Provides caching and loading states for score group ticket queries
 */

import { useQuery } from '@tanstack/react-query'
import { fetchTicketsByScoreGroup } from '@/lib/actions/score-group-actions'
import type { ScoreGroup } from '@/constants/classification-types'
import type { TicketReviewRecord } from '@/lib/supabase/types'

/**
 * Query key factory for score group tickets
 */
function getScoreGroupQueryKey(
	category: string | null,
	version: string | null,
	dates: string | null,
	scoreGroup: ScoreGroup | null,
	page: number,
	pageSize: number
) {
	return [
		'score-group-tickets',
		{ category, version, dates, scoreGroup, page, pageSize },
	] as const
}

/**
 * Result type for paginated score group tickets
 */
interface ScoreGroupTicketsResult {
	data: TicketReviewRecord[]
	total: number
	totalPages: number
	currentPage: number
	hasNextPage: boolean
	hasPreviousPage: boolean
}

/**
 * Hook to fetch tickets by score group
 *
 * Only fetches when all required params are provided (enabled when modal is open)
 */
export function useScoreGroupTickets(
	category: string | null,
	version: string | null,
	dates: string | null,
	scoreGroup: ScoreGroup | null,
	page: number,
	pageSize: number = 20
): {
	data: ScoreGroupTicketsResult
	isLoading: boolean
	isFetching: boolean
	error: Error | null
	refetch: () => void
} {
	const isEnabled =
		category !== null && version !== null && scoreGroup !== null

	const query = useQuery<{ data: TicketReviewRecord[]; total: number }>({
		queryKey: getScoreGroupQueryKey(
			category,
			version,
			dates,
			scoreGroup,
			page,
			pageSize
		),
		queryFn: async () => {
			if (!category || !version || !scoreGroup) {
				return { data: [], total: 0 }
			}

			return fetchTicketsByScoreGroup(category, version, dates, scoreGroup, {
				page,
				pageSize,
			})
		},
		enabled: isEnabled,
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2,
		retryDelay: 1000,
	})

	const total = query.data?.total ?? 0
	const totalPages = Math.ceil(total / pageSize)

	return {
		data: {
			data: query.data?.data ?? [],
			total,
			totalPages,
			currentPage: page,
			hasNextPage: page < totalPages - 1,
			hasPreviousPage: page > 0,
		},
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		error: query.error as Error | null,
		refetch: query.refetch,
	}
}
