'use client'

/**
 * Auto-Close React Query Hook
 *
 * Fetches auto-closed ticket stats (by tag) from ai_agent_tasks.
 * Depends only on the date range — auto-closes carry no subtype/version.
 */

import { useQuery } from '@tanstack/react-query'
import { fetchAutoClosePageData } from '@/lib/actions/automation-overview-actions'
import { QUERY_CACHE_CONFIG } from '@/lib/queries/query-config'
import { autoCloseKeys } from '@/lib/queries/query-keys'

export function useAutoCloseData(dateRange: { from: Date; to: Date }) {
	const query = useQuery({
		queryKey: autoCloseKeys.data(dateRange),
		queryFn: async () => {
			const result = await fetchAutoClosePageData(dateRange)
			if (!result.success) {
				throw new Error(result.error ?? 'Failed to fetch auto-close data')
			}
			return result.data ?? { totalTasks: 0, totalTickets: 0, tags: [] }
		},
		...QUERY_CACHE_CONFIG,
	})

	return {
		data: query.data ?? null,
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
		isFetching: query.isFetching,
	}
}
