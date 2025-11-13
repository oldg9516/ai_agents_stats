/**
 * Dashboard React Query Hooks - NEW LOGIC (using change_classification)
 *
 * React Query hooks for fetching new dashboard data with AI Success/Failure metrics.
 * Includes timeout protection, retry logic, and caching configuration.
 */

import { useQuery } from '@tanstack/react-query'
import type {
	CategoryDistributionResultNew,
	DashboardFilters,
	KPIDataNew,
	QualityTrendDataNew,
	VersionComparisonDataNew,
} from '@/lib/supabase/types'
import {
	fetchCategoryDistributionNew,
	fetchKPIDataNew,
	fetchQualityTrendsNew,
	fetchVersionComparisonNew,
} from '@/lib/actions/dashboard-actions-new'

// Timeout and retry configuration
const QUERY_TIMEOUT = 30000 // 30 seconds
const QUERY_RETRY = 2 // 2 retry attempts
const QUERY_RETRY_DELAY = 1000 // 1 second delay between retries

/**
 * Fetch KPI Data with NEW logic
 */
export function useKPIDataNew(filters: DashboardFilters) {
	return useQuery<KPIDataNew>({
		queryKey: ['kpi-data-new', filters],
		queryFn: async () => {
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error('Query timeout after 30s')),
					QUERY_TIMEOUT
				)
			)
			return Promise.race([fetchKPIDataNew(filters), timeoutPromise])
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: QUERY_RETRY,
		retryDelay: QUERY_RETRY_DELAY,
	})
}

/**
 * Fetch Quality Trends with NEW logic
 */
export function useQualityTrendsNew(filters: DashboardFilters) {
	return useQuery<QualityTrendDataNew[]>({
		queryKey: ['quality-trends-new', filters],
		queryFn: async () => {
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error('Query timeout after 30s')),
					QUERY_TIMEOUT
				)
			)
			return Promise.race([fetchQualityTrendsNew(filters), timeoutPromise])
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: QUERY_RETRY,
		retryDelay: QUERY_RETRY_DELAY,
	})
}

/**
 * Fetch Category Distribution with NEW logic
 */
export function useCategoryDistributionNew(filters: DashboardFilters) {
	return useQuery<CategoryDistributionResultNew>({
		queryKey: ['category-distribution-new', filters],
		queryFn: async () => {
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error('Query timeout after 30s')),
					QUERY_TIMEOUT
				)
			)
			return Promise.race([
				fetchCategoryDistributionNew(filters),
				timeoutPromise,
			])
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: QUERY_RETRY,
		retryDelay: QUERY_RETRY_DELAY,
	})
}

/**
 * Fetch Version Comparison with NEW logic
 */
export function useVersionComparisonNew(filters: DashboardFilters) {
	return useQuery<VersionComparisonDataNew[]>({
		queryKey: ['version-comparison-new', filters],
		queryFn: async () => {
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error('Query timeout after 30s')),
					QUERY_TIMEOUT
				)
			)
			return Promise.race([
				fetchVersionComparisonNew(filters),
				timeoutPromise,
			])
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: QUERY_RETRY,
		retryDelay: QUERY_RETRY_DELAY,
	})
}

/**
 * Combined hook to fetch all dashboard data at once
 */
export function useDashboardDataNew(filters: DashboardFilters) {
	const kpiData = useKPIDataNew(filters)
	const qualityTrends = useQualityTrendsNew(filters)
	const categoryDistribution = useCategoryDistributionNew(filters)
	const versionComparison = useVersionComparisonNew(filters)

	return {
		kpiData: kpiData.data,
		qualityTrends: qualityTrends.data,
		categoryDistribution: categoryDistribution.data,
		versionComparison: versionComparison.data,
		isLoading:
			kpiData.isLoading ||
			qualityTrends.isLoading ||
			categoryDistribution.isLoading ||
			versionComparison.isLoading,
		isError:
			kpiData.isError ||
			qualityTrends.isError ||
			categoryDistribution.isError ||
			versionComparison.isError,
		error:
			kpiData.error ||
			qualityTrends.error ||
			categoryDistribution.error ||
			versionComparison.error,
	}
}
