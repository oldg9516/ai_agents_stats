/**
 * NEW DASHBOARD QUERIES
 *
 * This file contains query functions for the new dashboard that use
 * change_classification field instead of the simple 'changed' boolean.
 *
 * Logic:
 * - AI Success = no_significant_change + stylistic_preference
 * - AI Failure = critical_error + meaningful_improvement
 *
 * For data before 11.11.2025, falls back to old logic (changed field)
 */

import { supabaseServer } from './server'
import type {
	AIHumanComparisonRow,
	CategoryDistributionDataNew,
	CategoryDistributionResultNew,
	DashboardFilters,
	DetailedStatsRow,
	KPIDataNew,
	QualityTrendDataNew,
	TrendData,
	VersionComparisonDataNew,
} from './types'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

// Cutoff date for new logic (11.11.2025)
const NEW_LOGIC_CUTOFF = new Date('2025-11-11')

/**
 * Calculate trend data from current and previous values
 */
function calculateTrend(current: number, previous: number): TrendData {
	const value = current - previous
	const percentage =
		previous === 0 ? 0 : ((current - previous) / previous) * 100

	let direction: 'up' | 'down' | 'neutral' = 'neutral'
	if (value > 0) direction = 'up'
	else if (value < 0) direction = 'down'

	return {
		value: Math.abs(value),
		percentage: Math.abs(percentage),
		direction,
	}
}

/**
 * Get date range for previous period (same duration as current)
 */
function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
	const duration = to.getTime() - from.getTime()
	const previousTo = new Date(from.getTime() - 1) // 1ms before current from
	const previousFrom = new Date(previousTo.getTime() - duration)

	return {
		from: previousFrom,
		to: previousTo,
	}
}

/**
 * Helper: Calculate AI Success and Failure rates from classification counts
 */
function calculateAIRates(
	noSignificantChange: number,
	stylisticPreference: number,
	criticalError: number,
	meaningfulImprovement: number,
	total: number
): { successRate: number; failureRate: number } {
	if (total === 0) {
		return { successRate: 0, failureRate: 0 }
	}

	const successRate =
		((noSignificantChange + stylisticPreference) / total) * 100
	const failureRate =
		((criticalError + meaningfulImprovement) / total) * 100

	return { successRate, failureRate }
}

/**
 * Helper: Count classifications from records
 */
function countClassifications(records: AIHumanComparisonRow[]): {
	noSignificantChange: number
	stylisticPreference: number
	criticalError: number
	meaningfulImprovement: number
} {
	return {
		noSignificantChange: records.filter(
			r => r.change_classification === 'no_significant_change'
		).length,
		stylisticPreference: records.filter(
			r => r.change_classification === 'stylistic_preference'
		).length,
		criticalError: records.filter(
			r => r.change_classification === 'critical_error'
		).length,
		meaningfulImprovement: records.filter(
			r => r.change_classification === 'meaningful_improvement'
		).length,
	}
}

/**
 * Fetch KPI Data with NEW logic (using change_classification)
 */
export async function getKPIDataNew(
	filters: DashboardFilters
): Promise<KPIDataNew> {
	const { dateRange, versions, categories, agents } = filters
	const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

	// Select fields including change_classification
	const selectFields =
		'changed, request_subtype, change_classification, created_at'

	let currentQuery = supabase
		.from('ai_human_comparison')
		.select(selectFields, { count: 'exact' })
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	let previousQuery = supabase
		.from('ai_human_comparison')
		.select(selectFields, { count: 'exact' })
		.gte('created_at', previousPeriod.from.toISOString())
		.lte('created_at', previousPeriod.to.toISOString())

	// Apply filters
	if (agents.length > 0) {
		currentQuery = currentQuery.in('email', agents)
		previousQuery = previousQuery.in('email', agents)
	}

	if (versions.length > 0) {
		currentQuery = currentQuery.in('prompt_version', versions)
		previousQuery = previousQuery.in('prompt_version', versions)
	}

	if (categories.length > 0) {
		currentQuery = currentQuery.in('request_subtype', categories)
		previousQuery = previousQuery.in('request_subtype', categories)
	}

	const [
		{ data: currentData, count: currentCount },
		{ data: previousData, count: previousCount },
	] = await Promise.all([currentQuery, previousQuery])

	if (!currentData || !previousData) {
		throw new Error('Failed to fetch KPI data')
	}

	const currentRecords = currentData as unknown as AIHumanComparisonRow[]
	const previousRecords = previousData as unknown as AIHumanComparisonRow[]

	// Calculate totals
	const currentTotal = currentCount || 0
	const previousTotal = previousCount || 0

	// Count classifications for current period
	const currentClassifications = countClassifications(currentRecords)
	const previousClassifications = countClassifications(previousRecords)

	// Calculate AI Success and Failure rates
	const { successRate: currentSuccessRate, failureRate: currentFailureRate } =
		calculateAIRates(
			currentClassifications.noSignificantChange,
			currentClassifications.stylisticPreference,
			currentClassifications.criticalError,
			currentClassifications.meaningfulImprovement,
			currentTotal
		)

	const {
		successRate: previousSuccessRate,
		failureRate: previousFailureRate,
	} = calculateAIRates(
		previousClassifications.noSignificantChange,
		previousClassifications.stylisticPreference,
		previousClassifications.criticalError,
		previousClassifications.meaningfulImprovement,
		previousTotal
	)

	// Calculate best category (highest success rate)
	const categoryStatsSuccess = currentRecords.reduce((acc, record) => {
		const cat = record.request_subtype ?? 'unknown'
		if (!acc[cat]) {
			acc[cat] = {
				total: 0,
				noSignificantChange: 0,
				stylisticPreference: 0,
				criticalError: 0,
				meaningfulImprovement: 0,
			}
		}
		acc[cat].total++
		if (record.change_classification === 'no_significant_change')
			acc[cat].noSignificantChange++
		if (record.change_classification === 'stylistic_preference')
			acc[cat].stylisticPreference++
		if (record.change_classification === 'critical_error')
			acc[cat].criticalError++
		if (record.change_classification === 'meaningful_improvement')
			acc[cat].meaningfulImprovement++
		return acc
	}, {} as Record<string, { total: number; noSignificantChange: number; stylisticPreference: number; criticalError: number; meaningfulImprovement: number }>)

	const bestCategory = Object.entries(categoryStatsSuccess).reduce(
		(best, [cat, stats]) => {
			const { successRate } = calculateAIRates(
				stats.noSignificantChange,
				stats.stylisticPreference,
				stats.criticalError,
				stats.meaningfulImprovement,
				stats.total
			)
			if (successRate > best.successRate) {
				return { category: cat, successRate }
			}
			return best
		},
		{ category: '', successRate: 0 }
	)

	// Calculate worst category (highest failure rate)
	const worstCategory = Object.entries(categoryStatsSuccess).reduce(
		(worst, [cat, stats]) => {
			const { failureRate } = calculateAIRates(
				stats.noSignificantChange,
				stats.stylisticPreference,
				stats.criticalError,
				stats.meaningfulImprovement,
				stats.total
			)
			if (failureRate > worst.failureRate) {
				return { category: cat, failureRate }
			}
			return worst
		},
		{ category: '', failureRate: 0 }
	)

	// Calculate previous period stats for best/worst categories
	const previousBestCategoryData = previousRecords.filter(
		r => r.request_subtype === bestCategory.category
	)
	const previousBestClassifications = countClassifications(
		previousBestCategoryData
	)
	const { successRate: previousBestSuccessRate } = calculateAIRates(
		previousBestClassifications.noSignificantChange,
		previousBestClassifications.stylisticPreference,
		previousBestClassifications.criticalError,
		previousBestClassifications.meaningfulImprovement,
		previousBestCategoryData.length
	)

	const previousWorstCategoryData = previousRecords.filter(
		r => r.request_subtype === worstCategory.category
	)
	const previousWorstClassifications = countClassifications(
		previousWorstCategoryData
	)
	const { failureRate: previousWorstFailureRate } = calculateAIRates(
		previousWorstClassifications.noSignificantChange,
		previousWorstClassifications.stylisticPreference,
		previousWorstClassifications.criticalError,
		previousWorstClassifications.meaningfulImprovement,
		previousWorstCategoryData.length
	)

	return {
		totalRecords: {
			current: currentTotal,
			previous: previousTotal,
			trend: calculateTrend(currentTotal, previousTotal),
		},
		aiSuccessRate: {
			current: currentSuccessRate,
			previous: previousSuccessRate,
			trend: calculateTrend(currentSuccessRate, previousSuccessRate),
		},
		aiFailureRate: {
			current: currentFailureRate,
			previous: previousFailureRate,
			trend: calculateTrend(currentFailureRate, previousFailureRate),
		},
		bestCategory: {
			category: bestCategory.category,
			successRate: bestCategory.successRate,
			previousSuccessRate: previousBestSuccessRate,
			trend: calculateTrend(
				bestCategory.successRate,
				previousBestSuccessRate
			),
		},
		worstCategory: {
			category: worstCategory.category,
			failureRate: worstCategory.failureRate,
			previousFailureRate: previousWorstFailureRate,
			trend: calculateTrend(
				worstCategory.failureRate,
				previousWorstFailureRate
			),
		},
	}
}

/**
 * Fetch Quality Trends data with NEW logic (for line chart)
 */
export async function getQualityTrendsNew(
	filters: DashboardFilters
): Promise<QualityTrendDataNew[]> {
	const { dateRange, versions, categories, agents } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('request_subtype, created_at, changed, change_classification')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	if (agents.length > 0) {
		query = query.in('email', agents)
	}

	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}

	if (categories.length > 0) {
		query = query.in('request_subtype', categories)
	}

	query = query.limit(50000)

	const { data, error } = await query

	if (error) throw error
	if (!data) return []

	const records = data as unknown as AIHumanComparisonRow[]

	// Group by category and week
	const weekGroups = records.reduce((acc, record) => {
		const category = record.request_subtype ?? 'unknown'
		const weekStart = getWeekStart(new Date(record.created_at ?? new Date()))
		const key = `${category}|${weekStart}`

		if (!acc[key]) {
			acc[key] = {
				category,
				weekStart,
				records: [],
			}
		}
		acc[key].records.push(record)
		return acc
	}, {} as Record<string, { category: string; weekStart: string; records: AIHumanComparisonRow[] }>)

	// Calculate rates for each group
	return Object.values(weekGroups).map(group => {
		const classifications = countClassifications(group.records)
		const { successRate, failureRate } = calculateAIRates(
			classifications.noSignificantChange,
			classifications.stylisticPreference,
			classifications.criticalError,
			classifications.meaningfulImprovement,
			group.records.length
		)

		return {
			category: group.category,
			weekStart: group.weekStart,
			successRate,
			failureRate,
			noSignificantChange: classifications.noSignificantChange,
			stylisticPreference: classifications.stylisticPreference,
			criticalError: classifications.criticalError,
			meaningfulImprovement: classifications.meaningfulImprovement,
			totalRecords: group.records.length,
		}
	})
}

/**
 * Get week start date (Monday) for a given date
 */
function getWeekStart(date: Date): string {
	const d = new Date(date)
	const day = d.getDay()
	const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
	const monday = new Date(d.setDate(diff))
	monday.setHours(0, 0, 0, 0)
	return monday.toISOString()
}

/**
 * Fetch Category Distribution with NEW logic (for pie chart)
 */
export async function getCategoryDistributionNew(
	filters: DashboardFilters
): Promise<CategoryDistributionResultNew> {
	const { dateRange, versions, categories, agents } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('request_subtype, changed, change_classification', {
			count: 'exact',
		})
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	if (agents.length > 0) {
		query = query.in('email', agents)
	}

	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}

	if (categories.length > 0) {
		query = query.in('request_subtype', categories)
	}

	const { data, error, count } = await query

	if (error) throw error
	if (!data) {
		return { categories: [], totalCount: 0 }
	}

	const records = data as unknown as AIHumanComparisonRow[]
	const totalCount = count || 0

	// Group by category
	const grouped = records.reduce((acc, record) => {
		const category = record.request_subtype ?? 'unknown'
		if (!acc[category]) {
			acc[category] = []
		}
		acc[category].push(record)
		return acc
	}, {} as Record<string, AIHumanComparisonRow[]>)

	const categoriesData = Object.entries(grouped).map(([category, catRecords]) => {
		const classifications = countClassifications(catRecords)
		const { successRate, failureRate } = calculateAIRates(
			classifications.noSignificantChange,
			classifications.stylisticPreference,
			classifications.criticalError,
			classifications.meaningfulImprovement,
			catRecords.length
		)

		return {
			category,
			totalRecords: catRecords.length,
			successRate,
			failureRate,
			noSignificantChange: classifications.noSignificantChange,
			stylisticPreference: classifications.stylisticPreference,
			criticalError: classifications.criticalError,
			meaningfulImprovement: classifications.meaningfulImprovement,
		}
	})

	return {
		categories: categoriesData,
		totalCount: totalCount,
	}
}

/**
 * Fetch Version Comparison with NEW logic (for bar chart)
 */
export async function getVersionComparisonNew(
	filters: DashboardFilters
): Promise<VersionComparisonDataNew[]> {
	const { dateRange, versions, categories, agents } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('prompt_version, changed, change_classification')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	if (agents.length > 0) {
		query = query.in('email', agents)
	}

	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}

	if (categories.length > 0) {
		query = query.in('request_subtype', categories)
	}

	query = query.limit(50000)

	const { data, error } = await query

	if (error) throw error
	if (!data) return []

	const records = data as unknown as AIHumanComparisonRow[]

	// Group by version
	const grouped = records.reduce((acc, record) => {
		const version = record.prompt_version ?? 'unknown'
		if (!acc[version]) {
			acc[version] = []
		}
		acc[version].push(record)
		return acc
	}, {} as Record<string, AIHumanComparisonRow[]>)

	return Object.entries(grouped).map(([version, versionRecords]) => {
		const classifications = countClassifications(versionRecords)
		const { successRate, failureRate } = calculateAIRates(
			classifications.noSignificantChange,
			classifications.stylisticPreference,
			classifications.criticalError,
			classifications.meaningfulImprovement,
			versionRecords.length
		)

		return {
			version,
			successRate,
			failureRate,
			totalRecords: versionRecords.length,
			noSignificantChange: classifications.noSignificantChange,
			stylisticPreference: classifications.stylisticPreference,
			criticalError: classifications.criticalError,
			meaningfulImprovement: classifications.meaningfulImprovement,
		}
	})
}
