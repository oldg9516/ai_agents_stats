'use server'

/**
 * Dashboard Server Actions
 *
 * Server-side functions that can be called directly from Client Components
 * Using Next.js 16 Server Actions for optimal performance and type safety
 */

import {
	getCategoryDistribution,
	getDefaultFilters,
	getDetailedStats,
	getDetailedStatsPaginated,
	getFilterOptions,
	getKPIData,
	getMinCreatedDate,
	getQualityTrends,
	getVersionComparison,
} from '@/lib/supabase/queries'
import type {
	CategoryDistributionResult,
	DashboardFilters,
	DetailedStatsRow,
	FilterOptions,
	KPIData,
	QualityTrendData,
	VersionComparisonData,
} from '@/lib/supabase/types'

/**
 * Fetch all dashboard data in one Server Action
 * Returns all KPI, charts, and table data
 */
export async function fetchDashboardData(filters: DashboardFilters) {
	try {
		// Fetch all data in parallel for best performance
		const promises = [
			getKPIData(filters),
			getQualityTrends(filters),
			getCategoryDistribution(filters),
			getVersionComparison(filters),
			getDetailedStats(filters),
		]

		// Track individual query times
		const results = await Promise.all(
			promises.map(async (promise, index) => {
				const queryStart = Date.now()
				const names = [
					'KPIs',
					'QualityTrends',
					'CategoryDist',
					'VersionComp',
					'DetailedStats',
				]
				try {
					const result = await promise
					return result
				} catch (error) {
					const queryTime = Date.now() - queryStart
					console.error(
						`❌ [Dashboard] ${names[index]} failed after ${queryTime}ms:`,
						error
					)
					throw error
				}
			})
		)

		const [
			kpi,
			qualityTrends,
			categoryDistribution,
			versionComparison,
			detailedStats,
		] = results

		return {
			success: true,
			data: {
				kpi,
				qualityTrends,
				categoryDistribution,
				versionComparison,
				detailedStats,
			},
		}
	} catch (error) {
		console.error(
			'❌ [Dashboard Server Action] Error fetching dashboard data:',
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch dashboard data',
		}
	}
}

/**
 * Fetch only KPI data
 * Useful for quick updates without fetching charts/table
 */
export async function fetchKPIData(
	filters: DashboardFilters
): Promise<KPIData> {
	return await getKPIData(filters)
}

/**
 * Fetch quality trends for the main chart
 */
export async function fetchQualityTrends(
	filters: DashboardFilters
): Promise<QualityTrendData[]> {
	return await getQualityTrends(filters)
}

/**
 * Fetch category distribution for pie chart
 */
export async function fetchCategoryDistribution(
	filters: DashboardFilters
): Promise<CategoryDistributionResult> {
	return await getCategoryDistribution(filters)
}

/**
 * Fetch version comparison for bar chart
 */
export async function fetchVersionComparison(
	filters: DashboardFilters
): Promise<VersionComparisonData[]> {
	return await getVersionComparison(filters)
}

/**
 * Fetch detailed stats for the table
 */
export async function fetchDetailedStats(
	filters: DashboardFilters
): Promise<DetailedStatsRow[]> {
	return await getDetailedStats(filters)
}

/**
 * Get available filter options (versions, categories)
 * @param dateRange - Optional date range to filter versions (only show versions with records in this period)
 */
export async function fetchFilterOptions(dateRange?: {
	from: Date
	to: Date
}): Promise<FilterOptions> {
	return await getFilterOptions(dateRange)
}

/**
 * Get minimum created_at date from database
 * Used for "All Time" filter preset
 */
export async function fetchMinCreatedDate(): Promise<Date> {
	try {
		const minDate = await getMinCreatedDate()

		return minDate
	} catch (error) {
		console.error('❌ [MinDate Server Action] Error:', error)
		// Fallback to a reasonable default
		return new Date('2020-01-01')
	}
}

/**
 * Fetch paginated detailed stats (for table pagination)
 */
export async function fetchDetailedStatsPaginated(
	filters: DashboardFilters,
	page: number,
	pageSize: number = 50
) {
	try {
		const result = await getDetailedStatsPaginated(filters, page, pageSize)

		return {
			success: true,
			data: result,
		}
	} catch (error) {
		console.error('❌ [DetailedStatsPaginated Server Action] Error:', error)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch paginated stats',
			data: {
				data: [],
				totalCount: 0,
				totalPages: 0,
				currentPage: page,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		}
	}
}

/**
 * Get default filters
 * Note: This is a pure function, but exported as Server Action for consistency
 */
export async function fetchDefaultFilters(): Promise<DashboardFilters> {
	return getDefaultFilters()
}

/**
 * Fetch ONLY detailed stats (for /detailed-stats page)
 * This is more efficient than fetching all dashboard data
 */
export async function fetchDetailedStatsOnly(filters: DashboardFilters) {
	try {
		const detailedStats = await getDetailedStats(filters)

		return {
			success: true,
			data: detailedStats,
		}
	} catch (error) {
		console.error('❌ [DetailedStats Server Action] Error:', error)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch detailed stats',
			data: [],
		}
	}
}
