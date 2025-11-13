/**
 * Dashboard Server Actions - NEW LOGIC (using change_classification)
 *
 * Server Actions for fetching dashboard data with new AI Success/Failure metrics.
 * These functions run on the server and bypass RLS using service_role key.
 *
 * Performance logging included for monitoring query times.
 */

'use server'

import type {
	CategoryDistributionResultNew,
	DashboardFilters,
	KPIDataNew,
	QualityTrendDataNew,
	VersionComparisonDataNew,
} from '@/lib/supabase/types'
import {
	getCategoryDistributionNew,
	getKPIDataNew,
	getQualityTrendsNew,
	getVersionComparisonNew,
} from '@/lib/supabase/queries-new'

/**
 * Fetch KPI Data with NEW logic (AI Success/Failure rates)
 */
export async function fetchKPIDataNew(
	filters: DashboardFilters
): Promise<KPIDataNew> {
	const startTime = performance.now()

	try {
		const data = await getKPIDataNew(filters)
		const endTime = performance.now()
		console.log(
			`[Server Action] fetchKPIDataNew completed in ${(endTime - startTime).toFixed(2)}ms`
		)
		return data
	} catch (error) {
		const endTime = performance.now()
		console.error(
			`[Server Action] fetchKPIDataNew failed after ${(endTime - startTime).toFixed(2)}ms:`,
			error
		)
		throw error
	}
}

/**
 * Fetch Quality Trends with NEW logic (success/failure rates over time)
 */
export async function fetchQualityTrendsNew(
	filters: DashboardFilters
): Promise<QualityTrendDataNew[]> {
	const startTime = performance.now()

	try {
		const data = await getQualityTrendsNew(filters)
		const endTime = performance.now()
		console.log(
			`[Server Action] fetchQualityTrendsNew completed in ${(endTime - startTime).toFixed(2)}ms - ${data.length} records`
		)
		return data
	} catch (error) {
		const endTime = performance.now()
		console.error(
			`[Server Action] fetchQualityTrendsNew failed after ${(endTime - startTime).toFixed(2)}ms:`,
			error
		)
		throw error
	}
}

/**
 * Fetch Category Distribution with NEW logic (success/failure per category)
 */
export async function fetchCategoryDistributionNew(
	filters: DashboardFilters
): Promise<CategoryDistributionResultNew> {
	const startTime = performance.now()

	try {
		const data = await getCategoryDistributionNew(filters)
		const endTime = performance.now()
		console.log(
			`[Server Action] fetchCategoryDistributionNew completed in ${(endTime - startTime).toFixed(2)}ms - ${data.categories.length} categories, total: ${data.totalCount}`
		)
		return data
	} catch (error) {
		const endTime = performance.now()
		console.error(
			`[Server Action] fetchCategoryDistributionNew failed after ${(endTime - startTime).toFixed(2)}ms:`,
			error
		)
		throw error
	}
}

/**
 * Fetch Version Comparison with NEW logic (success/failure per version)
 */
export async function fetchVersionComparisonNew(
	filters: DashboardFilters
): Promise<VersionComparisonDataNew[]> {
	const startTime = performance.now()

	try {
		const data = await getVersionComparisonNew(filters)
		const endTime = performance.now()
		console.log(
			`[Server Action] fetchVersionComparisonNew completed in ${(endTime - startTime).toFixed(2)}ms - ${data.length} versions`
		)
		return data
	} catch (error) {
		const endTime = performance.now()
		console.error(
			`[Server Action] fetchVersionComparisonNew failed after ${(endTime - startTime).toFixed(2)}ms:`,
			error
		)
		throw error
	}
}
