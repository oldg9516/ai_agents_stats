'use client'

/**
 * Hook for fetching ONLY detailed stats data
 *
 * This is optimized for /detailed-stats page - it only fetches the table data,
 * not all dashboard data (KPIs + charts + table).
 *
 * Much more efficient than useDashboardData for the detailed stats page.
 *
 * Uses TypeScript aggregation for data processing.
 */

import { fetchDetailedStatsTS } from '@/lib/actions/detailed-stats-actions'
import type { DashboardFilters } from '@/lib/db/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

/**
 * Generate query key for detailed stats
 */
function getDetailedStatsQueryKey(filters: DashboardFilters) {
	return [
		'detailedStats',
		{
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
			versions: filters.versions.sort(),
			categories: filters.categories.sort(),
		},
	] as const
}

/**
 * Hook for fetching detailed stats data only
 */
export function useDetailedStats(filters: DashboardFilters) {
	const queryClient = useQueryClient()
	const router = useRouter()

	const query = useQuery({
		queryKey: getDetailedStatsQueryKey(filters),
		queryFn: async () => {
			// Add timeout to prevent hanging requests
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

			try {
				const result = await fetchDetailedStatsTS(filters)
				clearTimeout(timeoutId)
				return result.data
			} catch (error) {
				clearTimeout(timeoutId)
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error(
						'Request timed out. Please try with more specific filters.'
					)
				}
				throw error
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes (increased cache time)
		gcTime: 10 * 60 * 1000, // 10 minutes (keep data longer)
		retry: 2, // Retry failed requests twice
		retryDelay: 1000, // Wait 1 second between retries
	})

	return {
		data: query.data || [],
		isLoading: query.isLoading,
		error: query.error as Error | null,
		refetch: query.refetch,
		// Additional React Query states
		isFetching: query.isFetching,
		isRefetching: query.isRefetching,
	}
}
