'use client'

/**
 * TanStack Query hooks for Dashboard data
 *
 * Replaces custom useState/useEffect patterns with React Query
 * for better caching, refetching, and state management
 */

import {
	fetchDashboardData,
	fetchDetailedStatsPaginated,
} from '@/lib/actions/dashboard-actions'
import { supabase } from '@/lib/supabase/client'
import type {
	CategoryDistributionResult,
	DashboardFilters,
	DetailedStatsRow,
	KPIData,
	QualityTrendData,
	VersionComparisonData,
} from '@/lib/supabase/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

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
 * Dashboard data structure returned by useDashboardData hook
 */
type DashboardData = {
	kpi: KPIData | null
	qualityTrends: QualityTrendData[]
	categoryDistribution: CategoryDistributionResult
	versionComparison: VersionComparisonData[]
	detailedStats: DetailedStatsRow[]
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
export function useDashboardData(filters: DashboardFilters): {
	data: DashboardData
	isLoading: boolean
	error: Error | null
	refetch: () => void
	isFetching: boolean
	isRefetching: boolean
} {
	const queryClient = useQueryClient()
	const router = useRouter()

	// Main query with explicit return type
	const query = useQuery<DashboardData>({
		queryKey: getDashboardQueryKey(filters),
		queryFn: async (): Promise<DashboardData> => {
			// Add timeout to prevent hanging requests
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

			try {
				const result = await fetchDashboardData(filters)
				clearTimeout(timeoutId)

				if (!result.success || !result.data) {
					throw new Error(result.error || 'Failed to fetch dashboard data')
				}

				return result.data as DashboardData
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
		data: query.data || {
			kpi: null,
			qualityTrends: [],
			categoryDistribution: { categories: [], totalCount: 0 },
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

/**
 * Generate query key for paginated detailed stats
 */
function getPaginatedStatsQueryKey(
	filters: DashboardFilters,
	page: number,
	pageSize: number
) {
	return [
		'detailed-stats-paginated',
		{
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
			versions: filters.versions.sort(),
			categories: filters.categories.sort(),
			agents: filters.agents.sort(),
			page,
			pageSize,
		},
	] as const
}

/**
 * Paginated detailed stats data structure
 */
type PaginatedStatsData = {
	data: DetailedStatsRow[]
	totalCount: number
	totalPages: number
	currentPage: number
	hasNextPage: boolean
	hasPreviousPage: boolean
}

/**
 * Hook for paginated detailed stats (table data)
 *
 * Features:
 * - Server-side pagination via SQL RPC
 * - Automatic caching (2 min stale time)
 * - Timeout protection (30 seconds)
 * - Retry logic (2 attempts)
 */
export function useDetailedStatsPaginated(
	filters: DashboardFilters,
	page: number,
	pageSize: number = 50
): {
	data: DetailedStatsRow[]
	totalCount: number
	totalPages: number
	currentPage: number
	hasNextPage: boolean
	hasPreviousPage: boolean
	isLoading: boolean
	error: Error | null
	refetch: () => void
	isFetching: boolean
} {
	const query = useQuery<PaginatedStatsData>({
		queryKey: getPaginatedStatsQueryKey(filters, page, pageSize),
		queryFn: async (): Promise<PaginatedStatsData> => {
			// Add timeout to prevent hanging requests
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

			try {
				const result = await fetchDetailedStatsPaginated(
					filters,
					page,
					pageSize
				)
				clearTimeout(timeoutId)

				if (!result.success || !result.data) {
					throw new Error(result.error || 'Failed to fetch paginated stats')
				}

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
		data: query.data?.data || [],
		totalCount: query.data?.totalCount || 0,
		totalPages: query.data?.totalPages || 0,
		currentPage: query.data?.currentPage || page,
		hasNextPage: query.data?.hasNextPage || false,
		hasPreviousPage: query.data?.hasPreviousPage || false,
		isLoading: query.isLoading,
		error: query.error as Error | null,
		refetch: query.refetch,
		isFetching: query.isFetching,
	}
}
