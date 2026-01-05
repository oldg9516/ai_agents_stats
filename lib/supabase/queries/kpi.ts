import { supabaseServer } from '../server'
import type { DashboardFilters, DateFilterMode, KPIData } from '../types'
import { calculateTrend, getPreviousPeriod, isAiQualityClassification } from './utils'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

/**
 * Fetch KPI Data with trends
 * @param filters - Dashboard filters
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function getKPIData(
	filters: DashboardFilters,
	dateFilterMode: DateFilterMode = 'created'
): Promise<KPIData> {
	const { dateRange, versions, categories, agents } = filters
	const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)
	const dateField = dateFilterMode === 'human_reply' ? 'human_reply_date' : 'created_at'

	// OPTIMIZATION: Select only fields needed for KPI calculation (not SELECT *)
	// This reduces data transfer significantly (4 fields instead of all)
	const selectFields = 'changed, request_subtype, change_classification, status'

	let currentQuery = supabase
		.from('ai_human_comparison')
		.select(selectFields, { count: 'exact' })
		.gte(dateField, dateRange.from.toISOString())
		.lte(dateField, dateRange.to.toISOString())

	let previousQuery = supabase
		.from('ai_human_comparison')
		.select(selectFields, { count: 'exact' })
		.gte(dateField, previousPeriod.from.toISOString())
		.lte(dateField, previousPeriod.to.toISOString())

	// For human_reply mode, filter out records with no human_reply_date
	if (dateFilterMode === 'human_reply') {
		currentQuery = currentQuery.not('human_reply_date', 'is', null)
		previousQuery = previousQuery.not('human_reply_date', 'is', null)
	}

	// Apply filters
	if (versions.length > 0) {
		currentQuery = currentQuery.in('prompt_version', versions)
		previousQuery = previousQuery.in('prompt_version', versions)
	}
	if (categories.length > 0) {
		currentQuery = currentQuery.in('request_subtype', categories)
		previousQuery = previousQuery.in('request_subtype', categories)
	}
	if (agents && agents.length > 0) {
		currentQuery = currentQuery.in('email', agents)
		previousQuery = previousQuery.in('email', agents)
	}

	// Separate queries for "Records Changed" - only status = 'compared'
	let currentChangedQuery = supabase
		.from('ai_human_comparison')
		.select('change_classification', { count: 'exact' })
		.gte(dateField, dateRange.from.toISOString())
		.lte(dateField, dateRange.to.toISOString())
		.eq('status', 'compared')
		.not('change_classification', 'is', null)
		.not('change_classification', 'eq', 'context_shift')

	let previousChangedQuery = supabase
		.from('ai_human_comparison')
		.select('change_classification', { count: 'exact' })
		.gte(dateField, previousPeriod.from.toISOString())
		.lte(dateField, previousPeriod.to.toISOString())
		.eq('status', 'compared')
		.not('change_classification', 'is', null)
		.not('change_classification', 'eq', 'context_shift')

	// For human_reply mode, filter out records with no human_reply_date
	if (dateFilterMode === 'human_reply') {
		currentChangedQuery = currentChangedQuery.not('human_reply_date', 'is', null)
		previousChangedQuery = previousChangedQuery.not('human_reply_date', 'is', null)
	}

	// Apply same filters to changed queries
	if (versions.length > 0) {
		currentChangedQuery = currentChangedQuery.in('prompt_version', versions)
		previousChangedQuery = previousChangedQuery.in('prompt_version', versions)
	}
	if (categories.length > 0) {
		currentChangedQuery = currentChangedQuery.in('request_subtype', categories)
		previousChangedQuery = previousChangedQuery.in(
			'request_subtype',
			categories
		)
	}
	if (agents && agents.length > 0) {
		currentChangedQuery = currentChangedQuery.in('email', agents)
		previousChangedQuery = previousChangedQuery.in('email', agents)
	}

	const [
		{ data: currentData, count: currentCount },
		{ data: previousData, count: previousCount },
		{ count: currentChangedCount },
		{ count: previousChangedCount },
	] = await Promise.all([
		currentQuery,
		previousQuery,
		currentChangedQuery,
		previousChangedQuery,
	])

	if (!currentData || !previousData) {
		throw new Error('Failed to fetch KPI data')
	}

	// Type assertion after null check - only the fields we selected
	type KPIRecord = {
		changed: boolean
		request_subtype: string | null
		change_classification: string | null
		status: string | null
	}
	const currentRecords = currentData as unknown as KPIRecord[]
	const previousRecords = previousData as unknown as KPIRecord[]

	// Calculate metrics - use count from query for accuracy
	const currentTotal = currentCount || 0
	const previousTotal = previousCount || 0

	// Count reviewed records (change_classification IS NOT NULL)
	const currentReviewed = currentRecords.filter(
		r => r.change_classification !== null
	).length
	const previousReviewed = previousRecords.filter(
		r => r.change_classification !== null
	).length

	// Count context_shift records to exclude from quality calculations
	const currentContextShift = currentRecords.filter(
		r => r.change_classification === 'context_shift'
	).length
	const previousContextShift = previousRecords.filter(
		r => r.change_classification === 'context_shift'
	).length

	// Evaluable records (reviewed records excluding context_shift)
	const currentEvaluable = currentReviewed - currentContextShift
	const previousEvaluable = previousReviewed - previousContextShift

	// Count records with changes - use count from separate SQL query (more accurate)
	// This matches Request Categories table logic: status = 'compared', classification IS NOT NULL, excluding context_shift
	const currentChanged = currentChangedCount || 0
	const previousChanged = previousChangedCount || 0

	// Good quality classifications: PERFECT_MATCH, STRUCTURAL_FIX, STYLISTIC_EDIT, no_significant_change, stylistic_preference
	const currentUnchanged = currentRecords.filter(r =>
		isAiQualityClassification(r.change_classification)
	).length
	const previousUnchanged = previousRecords.filter(r =>
		isAiQualityClassification(r.change_classification)
	).length

	// Quality calculated from evaluable records
	const currentAvgQuality =
		currentEvaluable > 0 ? (currentUnchanged / currentEvaluable) * 100 : 0
	const previousAvgQuality =
		previousEvaluable > 0 ? (previousUnchanged / previousEvaluable) * 100 : 0

	// Calculate best category (only reviewed records, excluding context_shift)
	const categoryStats = currentRecords.reduce((acc, record) => {
		// Skip non-reviewed and context_shift records
		if (
			record.change_classification === null ||
			record.change_classification === 'context_shift'
		)
			return acc

		const cat = record.request_subtype ?? 'unknown'
		if (!acc[cat]) {
			acc[cat] = { total: 0, unchanged: 0 }
		}
		acc[cat].total++
		// Count all AI quality classifications as unchanged (good quality)
		if (isAiQualityClassification(record.change_classification)) {
			acc[cat].unchanged++
		}
		return acc
	}, {} as Record<string, { total: number; unchanged: number }>)

	const bestCategory = Object.entries(categoryStats).reduce(
		(best, [cat, stats]) => {
			const percentage =
				stats.total > 0 ? (stats.unchanged / stats.total) * 100 : 0
			if (percentage > best.percentage) {
				return { category: cat, percentage }
			}
			return best
		},
		{ category: '', percentage: 0 }
	)

	// Calculate previous percentage for best category (only reviewed records, excluding context_shift)
	const previousCategoryData = previousRecords.filter(
		r =>
			r.request_subtype === bestCategory.category &&
			r.change_classification !== null &&
			r.change_classification !== 'context_shift'
	)
	const previousCategoryTotal = previousCategoryData.length
	const previousCategoryUnchanged = previousCategoryData.filter(r =>
		isAiQualityClassification(r.change_classification)
	).length
	const previousCategoryPercentage =
		previousCategoryTotal > 0
			? (previousCategoryUnchanged / previousCategoryTotal) * 100
			: 0

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
