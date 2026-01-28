'use client'

/**
 * TanStack Query hooks for Backlog Reports data
 */

import {
	fetchBacklogReports,
	fetchBacklogReportById,
	generateReport,
	fetchLatestReportTimestamp,
} from '@/lib/actions/backlog-reports-actions'
import type { BacklogReport, BacklogReportsFilters } from '@/lib/supabase/types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Generate query key for backlog reports list
 */
function getReportsQueryKey(filters: BacklogReportsFilters, page: number) {
	return [
		'backlog-reports',
		{
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
			periodDays: filters.periodDays,
			minTickets: filters.minTickets,
			searchQuery: filters.searchQuery,
			page,
		},
	] as const
}

/**
 * Hook for fetching paginated list of backlog reports
 */
export function useBacklogReports(
	filters: BacklogReportsFilters,
	page: number = 0
): {
	data: { data: BacklogReport[]; totalCount: number } | undefined
	isLoading: boolean
	error: Error | null
	refetch: () => void
	isFetching: boolean
} {
	const query = useQuery({
		queryKey: getReportsQueryKey(filters, page),
		queryFn: async () => {
			const result = await fetchBacklogReports(filters, page)
			if (!result.success || !result.data) {
				throw new Error(result.error || 'Failed to fetch reports')
			}
			return result.data
		},
		staleTime: 1 * 60 * 1000, // 1 minute - short but not zero to avoid excessive requests
		gcTime: 15 * 60 * 1000, // 15 minutes
	})

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
		isFetching: query.isFetching,
	}
}

/**
 * Hook for fetching a single backlog report by ID
 */
export function useBacklogReportDetail(reportId: string): {
	data: BacklogReport | undefined
	isLoading: boolean
	error: Error | null
	refetch: () => void
} {
	const query = useQuery({
		queryKey: ['backlog-report', reportId],
		queryFn: async () => {
			const result = await fetchBacklogReportById(reportId)
			if (!result.success || !result.data) {
				throw new Error(result.error || 'Failed to fetch report')
			}
			return result.data
		},
		staleTime: 10 * 60 * 1000, // 10 minutes - reports don't change
		gcTime: 30 * 60 * 1000, // 30 minutes
		enabled: !!reportId,
	})

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	}
}

/**
 * Hook for triggering report generation
 */
export function useGenerateReport() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: generateReport,
		onSuccess: () => {
			// Invalidate the list to trigger refetch when new report appears
			queryClient.invalidateQueries({ queryKey: ['backlog-reports'] })
		},
	})
}

/**
 * Hook for polling latest report timestamp
 * Used to detect when a new report is generated
 */
export function useLatestReportTimestamp(enabled: boolean = false) {
	return useQuery({
		queryKey: ['backlog-reports', 'latest-timestamp'],
		queryFn: async () => {
			const result = await fetchLatestReportTimestamp()
			if (!result.success) {
				throw new Error(result.error || 'Failed to fetch timestamp')
			}
			return result.data
		},
		enabled,
		refetchInterval: enabled ? 30000 : false, // Poll every 30 seconds when enabled
		staleTime: 0, // Always fetch fresh data when polling
	})
}
