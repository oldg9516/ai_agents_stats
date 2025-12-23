import { supabaseServer } from '../server'
import type {
	AIHumanComparisonRow,
	CategoryDistributionResult,
	DashboardFilters,
	DateFilterMode,
	QualityTrendData,
	VersionComparisonData,
} from '../types'
import { fetchAllInBatchesGeneric, type BatchFetchFilters } from '../helpers'
import { extractVersionNumber, getDayStart, getWeekStart } from './utils'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

/**
 * Apply dashboard filters to a Supabase query
 * Used by batch fetching for quality trends and version comparison
 */
function applyDashboardFilters(
	query: ReturnType<typeof supabase.from>['select'],
	filters: BatchFetchFilters
) {
	const { versions, categories, agents } = filters

	if (versions && versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (categories && categories.length > 0) {
		query = query.in('request_subtype', categories)
	}
	if (agents && agents.length > 0) {
		query = query.in('email', agents)
	}

	return query
}

/**
 * Fetch Quality Trends data (for line chart)
 * Uses only reviewed records (change_classification IS NOT NULL)
 * Uses batch fetching to handle large datasets (bypasses 1000 row limit)
 * @param filters - Dashboard filters
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function getQualityTrends(
	filters: DashboardFilters,
	dateFilterMode: DateFilterMode = 'created'
): Promise<QualityTrendData[]> {
	const { dateRange, versions, categories, agents } = filters

	// Use batch fetching for unlimited records
	const records = await fetchAllInBatchesGeneric<AIHumanComparisonRow>(
		supabase,
		'ai_human_comparison',
		'request_subtype, created_at, human_reply_date, changed, change_classification',
		{ dateRange, versions, categories, agents, dateFilterMode },
		(query, f) => {
			// Apply dashboard filters + only reviewed records
			query = applyDashboardFilters(query, f)
			query = query.not('change_classification', 'is', null)
			// For human_reply mode, also filter out records with no human_reply_date
			if (f.dateFilterMode === 'human_reply') {
				query = query.not('human_reply_date', 'is', null)
			}
			return query
		}
	)

	if (!records.length) return []

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
		// Use appropriate date field based on mode
		const dateValue = dateFilterMode === 'human_reply'
			? record.human_reply_date
			: record.created_at
		const dateKey = groupByDay
			? getDayStart(new Date(dateValue ?? new Date()))
			: getWeekStart(new Date(dateValue ?? new Date()))
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
 * @param filters - Dashboard filters
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function getCategoryDistribution(
	filters: DashboardFilters,
	dateFilterMode: DateFilterMode = 'created'
): Promise<CategoryDistributionResult> {
	const { dateRange, versions, categories, agents } = filters

	// Use RPC function for server-side aggregation
	// This avoids Supabase's default 1000 row limit
	// @ts-expect-error - Supabase RPC types not fully generated yet
	const { data, error } = await supabase.rpc('get_category_distribution', {
		p_from_date: dateRange.from.toISOString(),
		p_to_date: dateRange.to.toISOString(),
		p_versions: versions.length > 0 ? versions : null,
		p_categories: categories.length > 0 ? categories : null,
		p_agents: agents && agents.length > 0 ? agents : null,
		p_date_field: dateFilterMode === 'human_reply' ? 'human_reply_date' : 'created_at',
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

	return {
		categories: categoriesData,
		totalCount: totalCount,
	}
}

/**
 * Fetch Version Comparison data (for bar chart)
 * Uses batch fetching to handle large datasets (bypasses 1000 row limit)
 * @param filters - Dashboard filters
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function getVersionComparison(
	filters: DashboardFilters,
	dateFilterMode: DateFilterMode = 'created'
): Promise<VersionComparisonData[]> {
	const { dateRange, versions, categories, agents } = filters

	// Use batch fetching for unlimited records
	const records = await fetchAllInBatchesGeneric<AIHumanComparisonRow>(
		supabase,
		'ai_human_comparison',
		'prompt_version, changed, change_classification',
		{ dateRange, versions, categories, agents, dateFilterMode },
		(query, f) => {
			query = applyDashboardFilters(query, f)
			// For human_reply mode, filter out records with no human_reply_date
			if (f.dateFilterMode === 'human_reply') {
				query = query.not('human_reply_date', 'is', null)
			}
			return query
		}
	)

	if (!records.length) return []

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
