import { supabaseServer } from '../server'
import type {
	AIHumanComparisonRow,
	CategoryDistributionResult,
	DashboardFilters,
	QualityTrendData,
	VersionComparisonData,
} from '../types'
import { extractVersionNumber, getDayStart, getWeekStart } from './utils'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

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
	const groupByDay = diffDays <= 14 // Use day grouping for periods <= 14 days

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

	console.log('Category Distribution Results (RPC):', {
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
