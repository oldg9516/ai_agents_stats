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
	getFilterOptions,
	getKPIData,
	getMinCreatedDate,
	getQualityTrends,
	getVersionComparison,
} from '@/lib/supabase/queries'
import { fetchDetailedStatsTS } from './detailed-stats-actions'
import type {
	CategoryDistributionResult,
	DashboardFilters,
	DateFilterMode,
	DetailedStatsRow,
	FilterOptions,
	KPIData,
	QualityTrendData,
	VersionComparisonData,
} from '@/lib/supabase/types'

// Request timeout constant (30 seconds)
const REQUEST_TIMEOUT = 30000

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise(ms: number, operationName: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(
			() => reject(new Error(`${operationName} timed out after ${ms}ms`)),
			ms
		)
	)
}

/**
 * Fetch all dashboard data in one Server Action
 * Returns all KPI, charts, and table data
 *
 * Uses TypeScript aggregation for detailedStats (migrated from SQL RPC)
 * Includes 30s timeout protection to prevent hanging requests
 *
 * @param filters - Dashboard filters
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function fetchDashboardData(
	filters: DashboardFilters,
	dateFilterMode: DateFilterMode = 'created'
) {
	try {
		// Fetch all data in parallel for best performance
		const promises = [
			getKPIData(filters, dateFilterMode),
			getQualityTrends(filters, dateFilterMode),
			getCategoryDistribution(filters, dateFilterMode),
			getVersionComparison(filters, dateFilterMode),
			fetchDetailedStatsTS(filters, false, dateFilterMode).then(result => result.data),
		]

		// Track individual query times
		const dataPromise = Promise.all(
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

		// Add timeout protection
		const results = await Promise.race([
			dataPromise,
			createTimeoutPromise(REQUEST_TIMEOUT, 'Dashboard data fetch'),
		])

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
 * Get default filters
 * Note: This is a pure function, but exported as Server Action for consistency
 */
export async function fetchDefaultFilters(): Promise<DashboardFilters> {
	return getDefaultFilters()
}
