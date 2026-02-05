'use client'

/**
 * TanStack Query hooks for Support Overview data
 *
 * Uses Server Actions to fetch data with SERVICE ROLE key
 * This bypasses RLS restrictions on support_threads_data table
 */

import {
	fetchAvailableCategoriesAction,
	fetchRequestCategoryStatsAction,
	fetchSupportData,
} from '@/lib/actions/support-actions'
import { QUERY_CACHE_CONFIG, QUERY_CACHE_CONFIG_EXTENDED, REQUEST_TIMEOUT } from './query-config'
import type {
	CorrelationCell,
	ResolutionTimeData,
	SankeyData,
	StatusDistribution,
	SupportFilters,
	SupportKPIs,
	SupportThread,
} from '@/lib/supabase/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
			categories: filters.categories.sort(),
			requirements: filters.requirements.sort(),
			versions: filters.versions.sort(),
			pendingDraftsOnly: filters.pendingDraftsOnly,
			hideRequiresEditing: filters.hideRequiresEditing,
		},
	] as const
}

/**
 * Support data structure returned by useSupportData hook
 */
type SupportData = {
	kpis: SupportKPIs | null
	statusDistribution: StatusDistribution[]
	resolutionTime: ResolutionTimeData[]
	sankeyData: SankeyData | null
	correlationMatrix: CorrelationCell[]
	threads: SupportThread[]
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
export function useSupportData(filters: SupportFilters): {
	data: SupportData
	isLoading: boolean
	error: Error | null
	refetch: () => void
	isFetching: boolean
	isRefetching: boolean
} {
	// Main query with explicit return type - calls Server Action to fetch all support data
	const query = useQuery<SupportData>({
		queryKey: getSupportQueryKey(filters),
		queryFn: async (): Promise<SupportData> => {
			// Add timeout to prevent hanging requests
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

			try {
				const result = await fetchSupportData(filters)
				clearTimeout(timeoutId)

				if (!result.success || !result.data) {
					throw new Error(result.error || 'Failed to fetch support data')
				}

				return result.data as SupportData
			} catch (error) {
				clearTimeout(timeoutId)
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error('Request timed out. Please try with more specific filters.')
				}
				throw error
			}
		},
		...QUERY_CACHE_CONFIG,
	})

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

/**
 * Hook for fetching Request Category Statistics
 * Returns all request types and subtypes with counts and percentages
 */
export function useRequestCategoryStats(dateRange: { from: Date; to: Date }) {
	const query = useQuery({
		queryKey: ['request-category-stats', {
			from: dateRange.from.toISOString(),
			to: dateRange.to.toISOString(),
		}],
		queryFn: async () => {
			const result = await fetchRequestCategoryStatsAction(dateRange)
			if (!result.success || !result.data) {
				throw new Error(result.error || 'Failed to fetch request category stats')
			}
			return result.data
		},
		...QUERY_CACHE_CONFIG_EXTENDED,
	})

	return {
		data: query.data || [],
		isLoading: query.isLoading,
		error: query.error as Error | null,
		refetch: query.refetch,
		isFetching: query.isFetching,
	}
}

/**
 * Hook for fetching all available categories (request_subtype) for filter dropdown
 * Returns categories sorted: single categories first, then multi-categories
 */
export function useAvailableCategories(dateRange: { from: Date; to: Date }) {
	const query = useQuery({
		queryKey: ['available-categories', {
			from: dateRange.from.toISOString(),
			to: dateRange.to.toISOString(),
		}],
		queryFn: async () => {
			const result = await fetchAvailableCategoriesAction(dateRange)
			if (!result.success) {
				throw new Error(result.error || 'Failed to fetch available categories')
			}
			return result.data
		},
		...QUERY_CACHE_CONFIG_EXTENDED,
	})

	return {
		data: query.data || [],
		isLoading: query.isLoading,
		error: query.error as Error | null,
		refetch: query.refetch,
		isFetching: query.isFetching,
	}
}
