import { endOfDay, startOfDay, subDays } from 'date-fns'
import { supabaseServer } from './server'
import type {
	AIHumanComparisonRow,
	CategoryDistributionResult,
	DashboardFilters,
	FilterOptions,
	KPIData,
	QualityTrendData,
	VersionComparisonData,
} from './types'
import {
	calculateTrend,
	extractVersionNumber,
	getDayStart,
	getPreviousPeriod,
	getWeekStart,
} from './helpers'

// Re-export detailed stats functions
export { getDetailedStats, getDetailedStatsPaginated } from './queries-detailed'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

/**
 * Fetch KPI Data with trends
 * Uses RPC function for server-side aggregation (avoids 1000 row limit)
 */
export async function getKPIData(filters: DashboardFilters): Promise<KPIData> {
	const { dateRange, versions, categories } = filters
	const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

	// Use RPC functions for server-side aggregation (no row limits)
	const [currentKPI, previousKPI, bestCategoryData] = await Promise.all([
		// Current period KPI stats
		// @ts-expect-error - Supabase RPC types not fully generated yet
		supabase.rpc('get_kpi_stats', {
			p_from_date: dateRange.from.toISOString(),
			p_to_date: dateRange.to.toISOString(),
			p_versions: versions.length > 0 ? versions : null,
			p_categories: categories.length > 0 ? categories : null,
		}),
		// Previous period KPI stats
		// @ts-expect-error - Supabase RPC types not fully generated yet
		supabase.rpc('get_kpi_stats', {
			p_from_date: previousPeriod.from.toISOString(),
			p_to_date: previousPeriod.to.toISOString(),
			p_versions: versions.length > 0 ? versions : null,
			p_categories: categories.length > 0 ? categories : null,
		}),
		// Category distribution for best category calculation
		// @ts-expect-error - Supabase RPC types not fully generated yet
		supabase.rpc('get_category_distribution', {
			p_from_date: dateRange.from.toISOString(),
			p_to_date: dateRange.to.toISOString(),
			p_versions: versions.length > 0 ? versions : null,
			p_categories: categories.length > 0 ? categories : null,
		}),
	])

	if (currentKPI.error) throw currentKPI.error
	if (previousKPI.error) throw previousKPI.error
	if (bestCategoryData.error) throw bestCategoryData.error

	// Type the RPC results
	type KPIStatsResult = {
		total_records: number
		reviewed_records: number
		context_shift_records: number
		unchanged_records: number
		changed_records: number
		compared_records: number
	}

	type CategoryResult = {
		category: string
		total_records: number
		unchanged_records: number
	}

	// RPC returns array with single row
	const current = (currentKPI.data as unknown as KPIStatsResult[])?.[0] || {
		total_records: 0,
		reviewed_records: 0,
		context_shift_records: 0,
		unchanged_records: 0,
		changed_records: 0,
		compared_records: 0,
	}

	const previous = (previousKPI.data as unknown as KPIStatsResult[])?.[0] || {
		total_records: 0,
		reviewed_records: 0,
		context_shift_records: 0,
		unchanged_records: 0,
		changed_records: 0,
		compared_records: 0,
	}

	const categoryData =
		(bestCategoryData.data as unknown as CategoryResult[]) || []

	// Calculate metrics from RPC results
	const currentTotal = Number(current.total_records)
	const previousTotal = Number(previous.total_records)

	// Evaluable = reviewed - context_shift
	const currentEvaluable =
		Number(current.reviewed_records) - Number(current.context_shift_records)
	const previousEvaluable =
		Number(previous.reviewed_records) - Number(previous.context_shift_records)

	// Quality = unchanged / evaluable
	const currentAvgQuality =
		currentEvaluable > 0
			? (Number(current.unchanged_records) / currentEvaluable) * 100
			: 0
	const previousAvgQuality =
		previousEvaluable > 0
			? (Number(previous.unchanged_records) / previousEvaluable) * 100
			: 0

	// Compared records (status = 'compared', has classification, not context_shift)
	const currentChanged = Number(current.compared_records)
	const previousChanged = Number(previous.compared_records)

	// Find best category from distribution data
	let bestCategory = { category: '', percentage: 0 }
	for (const cat of categoryData) {
		const percentage =
			cat.total_records > 0
				? (cat.unchanged_records / cat.total_records) * 100
				: 0
		if (percentage > bestCategory.percentage) {
			bestCategory = { category: cat.category || 'unknown', percentage }
		}
	}

	// Get previous period data for best category
	let previousCategoryPercentage = 0
	if (bestCategory.category) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: prevCatData } = await (supabase as any).rpc(
			'get_category_distribution',
			{
				p_from_date: previousPeriod.from.toISOString(),
				p_to_date: previousPeriod.to.toISOString(),
				p_versions: versions.length > 0 ? versions : null,
				p_categories: [bestCategory.category],
			}
		)

		const prevCat = (prevCatData as unknown as CategoryResult[])?.[0]
		if (prevCat && prevCat.total_records > 0) {
			previousCategoryPercentage =
				(prevCat.unchanged_records / prevCat.total_records) * 100
		}
	}

	console.log('📊 KPI Stats (RPC):', {
		currentTotal,
		previousTotal,
		currentEvaluable,
		currentAvgQuality: currentAvgQuality.toFixed(1),
		currentChanged,
		bestCategory: bestCategory.category,
	})

	return {
		totalRecords: {
			current: currentTotal,
			previous: previousTotal,
			trend: calculateTrend(currentTotal, previousTotal),
		},
		averageQuality: {
			current: currentAvgQuality,
			previous: previousAvgQuality,
			trend: calculateTrend(currentAvgQuality, previousAvgQuality),
		},
		bestCategory: {
			category: bestCategory.category,
			percentage: bestCategory.percentage,
			previousPercentage: previousCategoryPercentage,
			trend: calculateTrend(
				bestCategory.percentage,
				previousCategoryPercentage
			),
		},
		recordsChanged: {
			current: currentChanged,
			previous: previousChanged,
			trend: calculateTrend(currentChanged, previousChanged),
		},
	}
}

/**
 * Fetch Quality Trends data (for line chart)
 * Uses only reviewed records (change_classification IS NOT NULL)
 */
export async function getQualityTrends(
	filters: DashboardFilters
): Promise<QualityTrendData[]> {
	const { dateRange, versions, categories } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('request_subtype, created_at, changed, change_classification')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())
		.not('change_classification', 'is', null) // Only reviewed records

	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (categories.length > 0) {
		query = query.in('request_subtype', categories)
	}

	// Increase limit from default 1000 to handle more records
	// For "All Time" filter, we might have many records
	query = query.limit(50000)

	const { data, error } = await query

	if (error) throw error
	if (!data) return []

	const records = data as unknown as AIHumanComparisonRow[]

	// Filter out context_shift records before calculations
	const evaluableRecords = records.filter(
		r => r.change_classification !== 'context_shift'
	)

	// Calculate date range in days
	const diffMs = dateRange.to.getTime() - dateRange.from.getTime()
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
	const groupByDay = diffDays <= 14 // Use day grouping for periods ≤ 14 days

	// Group by category and day/week (only evaluable records)
	const grouped = evaluableRecords.reduce((acc, record) => {
		const category = record.request_subtype ?? 'unknown'
		const dateKey = groupByDay
			? getDayStart(new Date(record.created_at ?? new Date()))
			: getWeekStart(new Date(record.created_at ?? new Date()))
		const key = `${category}|${dateKey}`

		if (!acc[key]) {
			acc[key] = { category, weekStart: dateKey, total: 0, unchanged: 0 }
		}
		acc[key].total++
		if (!record.changed) acc[key].unchanged++

		return acc
	}, {} as Record<string, { category: string; weekStart: string; total: number; unchanged: number }>)

	// Calculate percentages
	return Object.values(grouped).map(item => ({
		category: item.category,
		weekStart: item.weekStart,
		goodPercentage: (item.unchanged / item.total) * 100,
	}))
}

/**
 * Fetch Category Distribution data (for pie chart)
 * Uses RPC function to aggregate on database side (avoids 1000 row limit)
 */
export async function getCategoryDistribution(
	filters: DashboardFilters
): Promise<CategoryDistributionResult> {
	const { dateRange, versions, categories } = filters

	// Use RPC function for server-side aggregation
	// This avoids Supabase's default 1000 row limit
	// @ts-expect-error - Supabase RPC types not fully generated yet
	const { data, error } = await supabase.rpc('get_category_distribution', {
		p_from_date: dateRange.from.toISOString(),
		p_to_date: dateRange.to.toISOString(),
		p_versions: versions.length > 0 ? versions : null,
		p_categories: categories.length > 0 ? categories : null,
	})

	if (error) throw error
	// @ts-expect-error - data type inferred as never but we know it's an array
	if (!data || data.length === 0) {
		return { categories: [], totalCount: 0 }
	}

	// RPC returns array of { category, total_records, unchanged_records }
	const rpcData = data as unknown as Array<{
		category: string
		total_records: number
		unchanged_records: number
	}>

	// Calculate total count from aggregated data
	const totalCount = rpcData.reduce((sum, item) => sum + item.total_records, 0)

	// Map to expected format
	const categoriesData = rpcData.map(item => ({
		category: item.category || 'unknown',
		totalRecords: item.total_records,
		goodPercentage:
			item.total_records > 0
				? (item.unchanged_records / item.total_records) * 100
				: 0,
	}))

	console.log('🥧 Category Distribution Results (RPC):', {
		categoriesCount: categoriesData.length,
		totalCount: totalCount,
		dateRange: `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`,
	})

	return {
		categories: categoriesData,
		totalCount: totalCount,
	}
}

/**
 * Fetch Version Comparison data (for bar chart)
 */
export async function getVersionComparison(
	filters: DashboardFilters
): Promise<VersionComparisonData[]> {
	const { dateRange, versions, categories } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('prompt_version, changed, change_classification')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (categories.length > 0) {
		query = query.in('request_subtype', categories)
	}

	// Increase limit to handle more records
	query = query.limit(50000)

	const { data, error } = await query

	if (error) throw error
	if (!data) return []

	const records = data as unknown as AIHumanComparisonRow[]

	// Filter out context_shift records
	const evaluableRecords = records.filter(
		r => r.change_classification !== 'context_shift'
	)

	// Group by version (only evaluable records)
	const grouped = evaluableRecords.reduce((acc, record) => {
		const ver = record.prompt_version ?? 'unknown'
		if (!acc[ver]) {
			acc[ver] = { total: 0, unchanged: 0 }
		}
		acc[ver].total++
		if (!record.changed) acc[ver].unchanged++
		return acc
	}, {} as Record<string, { total: number; unchanged: number }>)

	return Object.entries(grouped)
		.map(([version, stats]) => ({
			version,
			totalRecords: stats.total,
			goodPercentage:
				stats.total > 0 ? (stats.unchanged / stats.total) * 100 : 0,
		}))
		.sort(
			(a, b) =>
				extractVersionNumber(b.version) - extractVersionNumber(a.version)
		)
}

/**
 * Get minimum created_at date from database
 * Used for "All Time" filter preset
 */
export async function getMinCreatedDate(): Promise<Date> {
	const { data, error } = await supabase.rpc('get_min_created_date')

	if (error) throw error
	if (!data) return new Date('2020-01-01') // Fallback

	return new Date(data)
}

/**
 * Get filter options (versions and categories)
 * @param dateRange - Optional date range to filter versions (only show versions with records in this period)
 */
export async function getFilterOptions(dateRange?: {
	from: Date
	to: Date
}): Promise<FilterOptions> {
	// @ts-expect-error - Supabase RPC types not fully generated yet
	const { data, error } = await supabase.rpc('get_filter_options', {
		p_from_date: dateRange ? dateRange.from.toISOString() : null,
		p_to_date: dateRange ? dateRange.to.toISOString() : null,
	})

	if (error) throw error
	// @ts-expect-error - data type inferred as never but we know it's an array
	if (!data || data.length === 0) return { versions: [], categories: [] }

	// RPC returns array with one row containing { versions: string[], categories: string[] }
	const result = data[0] as {
		versions: string[] | null
		categories: string[] | null
	}

	return {
		versions: result.versions || [],
		categories: result.categories || [],
	}
}

/**
 * Get default filters (Last 30 days, all versions, all categories)
 */
export function getDefaultFilters(): DashboardFilters {
	const to = endOfDay(new Date())
	const from = startOfDay(subDays(to, 30))

	return {
		dateRange: { from, to },
		versions: [],
		categories: [],
	}
}
