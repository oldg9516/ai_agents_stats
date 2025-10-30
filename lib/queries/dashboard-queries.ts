'use client'

/**
 * TanStack Query hooks for Dashboard data
 *
 * Replaces custom useState/useEffect patterns with React Query
 * for better caching, refetching, and state management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { fetchDashboardData } from '@/lib/actions/dashboard-actions'
import type { DashboardFilters } from '@/lib/supabase/types'

/**
 * Generate query key for dashboard data
 * Keys are arrays that uniquely identify queries for caching
 */
function getDashboardQueryKey(filters: DashboardFilters) {
	return [
		'dashboard',
		{
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
			versions: filters.versions.sort(),
			categories: filters.categories.sort(),
			agents: filters.agents.sort(),
		},
	] as const
}

/**
 * Main hook for fetching all dashboard data
 *
 * Features:
 * - Automatic caching (1 min stale time)
 * - Background refetching on window focus
 * - Real-time updates via Supabase subscriptions
 * - Smart request deduplication
 */
export function useDashboardData(filters: DashboardFilters) {
	const queryClient = useQueryClient()
	const router = useRouter()

	// Main query
	const query = useQuery({
		queryKey: getDashboardQueryKey(filters),
		queryFn: async () => {
			// Add timeout to prevent hanging requests
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

			try {
				const result = await fetchDashboardData(filters)
				clearTimeout(timeoutId)

				if (!result.success || !result.data) {
					throw new Error(result.error || 'Failed to fetch dashboard data')
				}

				return result.data
			} catch (error) {
				clearTimeout(timeoutId)
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error('Request timed out. Please try with more specific filters.')
				}
				throw error
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes (increased cache time)
		gcTime: 10 * 60 * 1000, // 10 minutes (keep data longer)
		retry: 2, // Retry failed requests twice
		retryDelay: 1000, // Wait 1 second between retries
	})

	// Real-time subscription
	useEffect(() => {
		const channel = supabase
			.channel('ai_human_comparison_changes')
			.on(
				'postgres_changes',
				{
					event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
					schema: 'public',
					table: 'ai_human_comparison',
				},
				() => {
					console.log('Real-time update received - invalidating dashboard queries')
					// Invalidate all dashboard queries to trigger refetch
					queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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
		data: query.data
			? {
					kpi: query.data.kpi,
					qualityTrends: query.data.qualityTrends,
					categoryDistribution: query.data.categoryDistribution,
					versionComparison: query.data.versionComparison,
					detailedStats: query.data.detailedStats,
			  }
			: {
					kpi: null,
					qualityTrends: [],
					categoryDistribution: [],
					versionComparison: [],
					detailedStats: [],
			  },
		isLoading: query.isLoading,
		error: query.error as Error | null,
		refetch: query.refetch,
		// Additional React Query states
		isFetching: query.isFetching, // True when refetching in background
		isRefetching: query.isRefetching, // True when refetch is triggered manually
	}
}

/**
 * Prefetch dashboard data
 * Useful for optimistic loading before user navigates
 */
export function usePrefetchDashboardData() {
	const queryClient = useQueryClient()

	return (filters: DashboardFilters) => {
		queryClient.prefetchQuery({
			queryKey: getDashboardQueryKey(filters),
			queryFn: async () => {
				const result = await fetchDashboardData(filters)
				if (!result.success || !result.data) {
					throw new Error(result.error || 'Failed to fetch dashboard data')
				}
				return result.data
			},
		})
	}
}
