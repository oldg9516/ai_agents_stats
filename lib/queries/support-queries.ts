'use client'

/**
 * TanStack Query hooks for Support Overview data
 *
 * Uses Server Actions to fetch data with SERVICE ROLE key
 * This bypasses RLS restrictions on support_threads_data table
 */

import { fetchSupportData } from '@/lib/actions/support-actions'
import { supabase } from '@/lib/supabase/client'
import type { SupportFilters } from '@/lib/supabase/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Generate query key for support data
 */
function getSupportQueryKey(filters: SupportFilters) {
	return [
		'support',
		{
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
			statuses: filters.statuses.sort(),
			requestTypes: filters.requestTypes.sort(),
			requirements: filters.requirements.sort(),
			versions: filters.versions.sort(),
		},
	] as const
}

/**
 * Main hook for fetching all support overview data
 *
 * Features:
 * - Automatic caching (1 min stale time)
 * - Background refetching on window focus
 * - Real-time updates via Supabase subscriptions
 * - Uses Server Actions with SERVICE ROLE key
 */
export function useSupportData(filters: SupportFilters) {
	const queryClient = useQueryClient()
	const router = useRouter()

	// Main query - calls Server Action to fetch all support data
	const query = useQuery({
		queryKey: getSupportQueryKey(filters),
		queryFn: async () => {
			const result = await fetchSupportData(filters)

			if (!result.success || !result.data) {
				throw new Error(result.error || 'Failed to fetch support data')
			}

			return result.data
		},
		staleTime: 60 * 1000, // 1 minute
		gcTime: 5 * 60 * 1000, // 5 minutes
	})

	// Real-time subscription
	useEffect(() => {
		const channel = supabase
			.channel('support-threads-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'support_threads_data',
				},
				() => {
					console.log(
						'Real-time update received - invalidating support queries'
					)
					// Invalidate all support queries to trigger refetch
					queryClient.invalidateQueries({ queryKey: ['support'] })
					// Also refresh Server Components
					router.refresh()
				}
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [queryClient, router])

	return {
		data: query.data || {
			kpis: null,
			statusDistribution: [],
			resolutionTime: [],
			sankeyData: null,
			correlationMatrix: [],
			threads: [],
		},
		isLoading: query.isLoading,
		error: query.error as Error | null,
		refetch: query.refetch,
		// Additional React Query states
		isFetching: query.isFetching,
		isRefetching: query.isRefetching,
	}
}

/**
 * Prefetch support data
 * Useful for optimistic loading before user navigates
 */
export function usePrefetchSupportData() {
	const queryClient = useQueryClient()

	return (filters: SupportFilters) => {
		queryClient.prefetchQuery({
			queryKey: getSupportQueryKey(filters),
			queryFn: async () => {
				const result = await fetchSupportData(filters)
				if (!result.success || !result.data) {
					throw new Error(result.error || 'Failed to fetch support data')
				}
				return result.data
			},
		})
	}
}
