import { supabaseServer } from '../server'
import type { DashboardFilters, DateFilterMode, KPIData } from '../types'
import { calculateTrend, getPreviousPeriod } from './utils'

// Use server-side Supabase client for all queries
// Type assertion needed because new RPC functions may not be in generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseServer as any

/**
 * Fetch KPI Data with trends using SQL RPC functions
 * This bypasses the 1000 row limit by aggregating on the database side
 * @param filters - Dashboard filters
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 * @param includedThreadIds - Thread IDs to INCLUDE (whitelist for showOnlyRequiresEditing filter)
 */
export async function getKPIData(
	filters: DashboardFilters,
	dateFilterMode: DateFilterMode = 'created',
	includedThreadIds?: string[]
): Promise<KPIData> {
	const { dateRange, versions, categories, agents } = filters
	const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)
	const dateField = dateFilterMode === 'human_reply' ? 'human_reply_date' : 'created_at'

	// Prepare included thread_ids parameter (null if empty = no filter)
	const includedParam = includedThreadIds && includedThreadIds.length > 0 ? includedThreadIds : null

	// Use SQL RPC functions for accurate aggregation (bypasses 1000 row limit)
	const [
		currentStatsResult,
		previousStatsResult,
		currentBestCategoryResult,
	] = await Promise.all([
		// Current period KPI stats
		supabase.rpc('get_kpi_stats', {
			p_from_date: dateRange.from.toISOString(),
			p_to_date: dateRange.to.toISOString(),
			p_versions: versions.length > 0 ? versions : null,
			p_categories: categories.length > 0 ? categories : null,
			p_agents: agents && agents.length > 0 ? agents : null,
			p_date_field: dateField,
			p_included_thread_ids: includedParam,
		}),
		// Previous period KPI stats
		supabase.rpc('get_kpi_stats', {
			p_from_date: previousPeriod.from.toISOString(),
			p_to_date: previousPeriod.to.toISOString(),
			p_versions: versions.length > 0 ? versions : null,
			p_categories: categories.length > 0 ? categories : null,
			p_agents: agents && agents.length > 0 ? agents : null,
			p_date_field: dateField,
			p_included_thread_ids: includedParam,
		}),
		// Current period best category
		supabase.rpc('get_best_category', {
			p_from_date: dateRange.from.toISOString(),
			p_to_date: dateRange.to.toISOString(),
			p_versions: versions.length > 0 ? versions : null,
			p_categories: categories.length > 0 ? categories : null,
			p_agents: agents && agents.length > 0 ? agents : null,
			p_date_field: dateField,
			p_included_thread_ids: includedParam,
		}),
	])

	if (currentStatsResult.error) {
		console.error('Error fetching current KPI stats:', currentStatsResult.error)
		throw new Error('Failed to fetch KPI data')
	}
	if (previousStatsResult.error) {
		console.error('Error fetching previous KPI stats:', previousStatsResult.error)
		throw new Error('Failed to fetch KPI data')
	}
	if (currentBestCategoryResult.error) {
		console.error('Error fetching best category:', currentBestCategoryResult.error)
		throw new Error('Failed to fetch KPI data')
	}

	// Extract stats from results
	const currentStats = currentStatsResult.data?.[0] || {
		total_records: 0,
		reviewed_records: 0,
		context_shift_records: 0,
		quality_records: 0,
		changed_records: 0,
	}
	const previousStats = previousStatsResult.data?.[0] || {
		total_records: 0,
		reviewed_records: 0,
		context_shift_records: 0,
		quality_records: 0,
		changed_records: 0,
	}
	const bestCategory = currentBestCategoryResult.data?.[0] || {
		category: '',
		total_evaluable: 0,
		quality_records: 0,
		quality_percentage: 0,
	}

	// Calculate quality percentages
	const currentEvaluable = Number(currentStats.reviewed_records) - Number(currentStats.context_shift_records)
	const previousEvaluable = Number(previousStats.reviewed_records) - Number(previousStats.context_shift_records)

	const currentAvgQuality = currentEvaluable > 0
		? (Number(currentStats.quality_records) / currentEvaluable) * 100
		: 0
	const previousAvgQuality = previousEvaluable > 0
		? (Number(previousStats.quality_records) / previousEvaluable) * 100
		: 0

	// Get previous period percentage for best category
	let previousCategoryPercentage = 0
	if (bestCategory.category) {
		const previousBestCategoryForCategory = await supabase.rpc('get_best_category', {
			p_from_date: previousPeriod.from.toISOString(),
			p_to_date: previousPeriod.to.toISOString(),
			p_versions: versions.length > 0 ? versions : null,
			p_categories: [bestCategory.category], // Filter to same category
			p_agents: agents && agents.length > 0 ? agents : null,
			p_date_field: dateField,
			p_included_thread_ids: includedParam,
		})

		if (!previousBestCategoryForCategory.error && previousBestCategoryForCategory.data?.[0]) {
			previousCategoryPercentage = Number(previousBestCategoryForCategory.data[0].quality_percentage) || 0
		}
	}

	return {
		totalRecords: {
			current: Number(currentStats.total_records),
			previous: Number(previousStats.total_records),
			trend: calculateTrend(Number(currentStats.total_records), Number(previousStats.total_records)),
		},
		averageQuality: {
			current: currentAvgQuality,
			previous: previousAvgQuality,
			trend: calculateTrend(currentAvgQuality, previousAvgQuality),
		},
		bestCategory: {
			category: bestCategory.category || '',
			percentage: Number(bestCategory.quality_percentage) || 0,
			previousPercentage: previousCategoryPercentage,
			trend: calculateTrend(
				Number(bestCategory.quality_percentage) || 0,
				previousCategoryPercentage
			),
		},
		recordsChanged: {
			current: Number(currentStats.changed_records),
			previous: Number(previousStats.changed_records),
			trend: calculateTrend(Number(currentStats.changed_records), Number(previousStats.changed_records)),
		},
	}
}
