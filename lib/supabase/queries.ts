import { endOfDay, startOfDay, subDays } from 'date-fns'
import { supabaseServer } from './server'
import type {
	AIHumanComparisonRow,
	CategoryDistributionData,
	CategoryDistributionResult,
	DashboardFilters,
	DetailedStatsRow,
	FilterOptions,
	KPIData,
	QualityTrendData,
	TrendData,
	VersionComparisonData,
} from './types'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

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
 * Extract numeric version from version string (e.g., "v1" -> 1, "v2" -> 2)
 */
function extractVersionNumber(version: string): number {
	const match = version.match(/\d+/)
	return match ? parseInt(match[0]) : 0
}

/**
 * Fetch KPI Data with trends
 */
export async function getKPIData(filters: DashboardFilters): Promise<KPIData> {
	const { dateRange, versions, categories } = filters
	const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

	// OPTIMIZATION: Select only fields needed for KPI calculation (not SELECT *)
	// This reduces data transfer significantly (4 fields instead of all)
	const selectFields = 'changed, request_subtype, change_classification, status'

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
	if (versions.length > 0) {
		currentQuery = currentQuery.in('prompt_version', versions)
		previousQuery = previousQuery.in('prompt_version', versions)
	}
	if (categories.length > 0) {
		currentQuery = currentQuery.in('request_subtype', categories)
		previousQuery = previousQuery.in('request_subtype', categories)
	}

	// Separate queries for "Records Changed" - only status = 'compared'
	let currentChangedQuery = supabase
		.from('ai_human_comparison')
		.select('change_classification', { count: 'exact' })
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())
		.eq('status', 'compared')
		.not('change_classification', 'is', null)
		.not('change_classification', 'eq', 'context_shift')

	let previousChangedQuery = supabase
		.from('ai_human_comparison')
		.select('change_classification', { count: 'exact' })
		.gte('created_at', previousPeriod.from.toISOString())
		.lte('created_at', previousPeriod.to.toISOString())
		.eq('status', 'compared')
		.not('change_classification', 'is', null)
		.not('change_classification', 'eq', 'context_shift')

	// Apply same filters to changed queries
	if (versions.length > 0) {
		currentChangedQuery = currentChangedQuery.in('prompt_version', versions)
		previousChangedQuery = previousChangedQuery.in('prompt_version', versions)
	}
	if (categories.length > 0) {
		currentChangedQuery = currentChangedQuery.in('request_subtype', categories)
		previousChangedQuery = previousChangedQuery.in('request_subtype', categories)
	}

	const [
		{ data: currentData, count: currentCount },
		{ data: previousData, count: previousCount },
		{ count: currentChangedCount },
		{ count: previousChangedCount },
	] = await Promise.all([currentQuery, previousQuery, currentChangedQuery, previousChangedQuery])

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
	const currentReviewed = currentRecords.filter(r => r.change_classification !== null).length
	const previousReviewed = previousRecords.filter(r => r.change_classification !== null).length

	// Count context_shift records to exclude from quality calculations
	const currentContextShift = currentRecords.filter(r => r.change_classification === 'context_shift').length
	const previousContextShift = previousRecords.filter(r => r.change_classification === 'context_shift').length

	// Evaluable records (reviewed records excluding context_shift)
	const currentEvaluable = currentReviewed - currentContextShift
	const previousEvaluable = previousReviewed - previousContextShift

	// Count records with changes - use count from separate SQL query (more accurate)
	// This matches Request Categories table logic: status = 'compared', classification IS NOT NULL, excluding context_shift
	const currentChanged = currentChangedCount || 0
	const previousChanged = previousChangedCount || 0

	// Unchanged records (no_significant_change or stylistic_preference - both are good quality)
	const currentUnchanged = currentRecords.filter(
		r => r.change_classification === 'no_significant_change' ||
		     r.change_classification === 'stylistic_preference'
	).length
	const previousUnchanged = previousRecords.filter(
		r => r.change_classification === 'no_significant_change' ||
		     r.change_classification === 'stylistic_preference'
	).length

	// Quality calculated from evaluable records
	const currentAvgQuality =
		currentEvaluable > 0 ? (currentUnchanged / currentEvaluable) * 100 : 0
	const previousAvgQuality =
		previousEvaluable > 0 ? (previousUnchanged / previousEvaluable) * 100 : 0

	// Calculate best category (only reviewed records, excluding context_shift)
	const categoryStats = currentRecords.reduce((acc, record) => {
		// Skip non-reviewed and context_shift records
		if (record.change_classification === null || record.change_classification === 'context_shift') return acc

		const cat = record.request_subtype ?? 'unknown'
		if (!acc[cat]) {
			acc[cat] = { total: 0, unchanged: 0 }
		}
		acc[cat].total++
		// Count no_significant_change and stylistic_preference as unchanged (good quality)
		if (record.change_classification === 'no_significant_change' ||
		    record.change_classification === 'stylistic_preference') {
			acc[cat].unchanged++
		}
		return acc
	}, {} as Record<string, { total: number; unchanged: number }>)

	const bestCategory = Object.entries(categoryStats).reduce(
		(best, [cat, stats]) => {
			const percentage = stats.total > 0 ? (stats.unchanged / stats.total) * 100 : 0
			if (percentage > best.percentage) {
				return { category: cat, percentage }
			}
			return best
		},
		{ category: '', percentage: 0 }
	)

	// Calculate previous percentage for best category (only reviewed records, excluding context_shift)
	const previousCategoryData = previousRecords.filter(
		r => r.request_subtype === bestCategory.category &&
		     r.change_classification !== null &&
		     r.change_classification !== 'context_shift'
	)
	const previousCategoryTotal = previousCategoryData.length
	const previousCategoryUnchanged = previousCategoryData.filter(
		r => r.change_classification === 'no_significant_change' ||
		     r.change_classification === 'stylistic_preference'
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
	const evaluableRecords = records.filter(r => r.change_classification !== 'context_shift')

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
 * Get week start date (Monday) in ISO format
 */
function getWeekStart(date: Date): string {
	const day = date.getDay()
	const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
	const monday = new Date(date.setDate(diff))
	monday.setHours(0, 0, 0, 0)
	return monday.toISOString()
}

/**
 * Get day start date in ISO format
 */
function getDayStart(date: Date): string {
	const dayStart = new Date(date)
	dayStart.setHours(0, 0, 0, 0)
	return dayStart.toISOString()
}

/**
 * Fetch Category Distribution data (for pie chart)
 */
export async function getCategoryDistribution(
	filters: DashboardFilters
): Promise<CategoryDistributionResult> {
	const { dateRange, versions, categories } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('request_subtype, changed, change_classification', { count: 'exact' })
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (categories.length > 0) {
		query = query.in('request_subtype', categories)
	}

	// Get all records without limit for accurate totals
	// Supabase default limit is 1000, which may truncate results
	const { data, error, count } = await query

	if (error) throw error
	if (!data) {
		return { categories: [], totalCount: 0 }
	}

	const records = data as unknown as AIHumanComparisonRow[]
	const totalCount = count || 0

	// Filter out context_shift records
	const evaluableRecords = records.filter(r => r.change_classification !== 'context_shift')

	console.log('🥧 Category Distribution Results:', {
		recordsReturned: records.length,
		evaluableRecords: evaluableRecords.length,
		totalCount: totalCount,
		dateRange: `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`,
	})

	// Group by category (only evaluable records)
	const grouped = evaluableRecords.reduce((acc, record) => {
		const cat = record.request_subtype ?? 'unknown'
		if (!acc[cat]) {
			acc[cat] = { total: 0, unchanged: 0 }
		}
		acc[cat].total++
		if (!record.changed) acc[cat].unchanged++
		return acc
	}, {} as Record<string, { total: number; unchanged: number }>)

	const categoriesData = Object.entries(grouped).map(([category, stats]) => ({
		category,
		totalRecords: stats.total,
		goodPercentage: stats.total > 0 ? (stats.unchanged / stats.total) * 100 : 0,
	}))

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
	const evaluableRecords = records.filter(r => r.change_classification !== 'context_shift')

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
			goodPercentage: stats.total > 0 ? (stats.unchanged / stats.total) * 100 : 0,
		}))
		.sort((a, b) => extractVersionNumber(b.version) - extractVersionNumber(a.version))
}

/**
 * Fetch Detailed Stats (for table)
 */
export async function getDetailedStats(
	filters: DashboardFilters
): Promise<DetailedStatsRow[]> {
	const { dateRange, versions, categories } = filters

	// OPTIMIZATION: Select only fields needed for detailed stats calculation
	// This reduces data transfer significantly (6 fields instead of all)
	const selectFields =
		'created_at, email, changed, request_subtype, prompt_version, change_classification'

	let query = supabase
		.from('ai_human_comparison')
		.select(selectFields)
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

	// Type assertion - only the fields we selected
	type DetailedStatsRecord = {
		created_at: string | null
		email: string | null
		changed: boolean
		request_subtype: string | null
		prompt_version: string | null
		change_classification: string | null
	}
	const records = data as unknown as DetailedStatsRecord[]
	const rows: DetailedStatsRow[] = []

	// Group by category and version first (Level 1)
	const versionGroups = records.reduce((acc, record) => {
		const category = record.request_subtype ?? 'unknown'
		const version = record.prompt_version ?? 'unknown'
		const key = `${category}|${version}`
		if (!acc[key]) {
			acc[key] = {
				category,
				version,
				records: [],
			}
		}
		acc[key].records.push(record)
		return acc
	}, {} as Record<string, { category: string; version: string; records: DetailedStatsRecord[] }>)

	// Helper function to count change classifications (legacy and new)
	// Legacy classifications are mapped to new ones for unified counting:
	// - critical_error -> CRITICAL_FACT_ERROR
	// - meaningful_improvement -> MINOR_INFO_GAP
	// - stylistic_preference -> STYLISTIC_EDIT
	// - no_significant_change -> PERFECT_MATCH
	// - context_shift -> EXCL_WORKFLOW_SHIFT
	const countClassifications = (records: DetailedStatsRecord[]) => {
		// Legacy classifications (v3.x) - direct counts
		const criticalErrors = records.filter(r => r.change_classification === 'critical_error').length
		const meaningfulImprovements = records.filter(r => r.change_classification === 'meaningful_improvement').length
		const stylisticPreferences = records.filter(r => r.change_classification === 'stylistic_preference').length
		const noSignificantChanges = records.filter(r => r.change_classification === 'no_significant_change').length
		const contextShifts = records.filter(r => r.change_classification === 'context_shift').length

		// New classifications (v4.0) - direct counts
		const newCriticalFactErrors = records.filter(r => r.change_classification === 'CRITICAL_FACT_ERROR').length
		const newMajorFunctionalOmissions = records.filter(r => r.change_classification === 'MAJOR_FUNCTIONAL_OMISSION').length
		const newMinorInfoGaps = records.filter(r => r.change_classification === 'MINOR_INFO_GAP').length
		const newConfusingVerbosity = records.filter(r => r.change_classification === 'CONFUSING_VERBOSITY').length
		const newTonalMisalignments = records.filter(r => r.change_classification === 'TONAL_MISALIGNMENT').length
		const newStructuralFixes = records.filter(r => r.change_classification === 'STRUCTURAL_FIX').length
		const newStylisticEdits = records.filter(r => r.change_classification === 'STYLISTIC_EDIT').length
		const newPerfectMatches = records.filter(r => r.change_classification === 'PERFECT_MATCH').length
		const newExclWorkflowShifts = records.filter(r => r.change_classification === 'EXCL_WORKFLOW_SHIFT').length
		const newExclDataDiscrepancies = records.filter(r => r.change_classification === 'EXCL_DATA_DISCREPANCY').length

		return {
			// Legacy classifications - direct counts for legacy mode
			criticalErrors,
			meaningfulImprovements,
			stylisticPreferences,
			noSignificantChanges,
			contextShifts,
			// New classifications - combine direct + mapped legacy for unified view
			// critical_error -> CRITICAL_FACT_ERROR
			criticalFactErrors: newCriticalFactErrors + criticalErrors,
			// (no legacy maps to MAJOR_FUNCTIONAL_OMISSION)
			majorFunctionalOmissions: newMajorFunctionalOmissions,
			// meaningful_improvement -> MINOR_INFO_GAP
			minorInfoGaps: newMinorInfoGaps + meaningfulImprovements,
			// (no legacy maps to these)
			confusingVerbosity: newConfusingVerbosity,
			tonalMisalignments: newTonalMisalignments,
			structuralFixes: newStructuralFixes,
			// stylistic_preference -> STYLISTIC_EDIT
			stylisticEdits: newStylisticEdits + stylisticPreferences,
			// no_significant_change -> PERFECT_MATCH
			perfectMatches: newPerfectMatches + noSignificantChanges,
			// context_shift -> EXCL_WORKFLOW_SHIFT
			exclWorkflowShifts: newExclWorkflowShifts + contextShifts,
			// (no legacy maps to EXCL_DATA_DISCREPANCY)
			exclDataDiscrepancies: newExclDataDiscrepancies,
			// Average score (calculated later)
			averageScore: null as number | null,
		}
	}

	// Process each version group
	Object.values(versionGroups).forEach(group => {
		// Use all records (no filtering by qualified agents)
		const allRecords = group.records
		const classifications = countClassifications(allRecords)

		// Reviewed records = records with classification (not null)
		const reviewedRecords = allRecords.filter(r => r.change_classification !== null)

		// AI Errors = critical_error + meaningful_improvement (from reviewed only)
		const aiErrors = reviewedRecords.filter(
			r => r.change_classification === 'critical_error' ||
			     r.change_classification === 'meaningful_improvement'
		).length

		// AI Quality = no_significant_change + stylistic_preference (from reviewed only)
		const aiQuality = reviewedRecords.filter(
			r => r.change_classification === 'no_significant_change' ||
			     r.change_classification === 'stylistic_preference'
		).length

		// Level 1: Version-level row
		rows.push({
			category: group.category,
			version: group.version,
			dates: null,
			sortOrder: 1,
			totalRecords: allRecords.length,
			reviewedRecords: reviewedRecords.length,
			aiErrors,
			aiQuality,
			...classifications,
		})

		// Level 2: Week-level rows
		const weekGroups = group.records.reduce((acc, record) => {
			const weekStart = getWeekStart(new Date(record.created_at ?? new Date()))
			if (!acc[weekStart]) {
				acc[weekStart] = []
			}
			acc[weekStart].push(record)
			return acc
		}, {} as Record<string, DetailedStatsRecord[]>)

		Object.entries(weekGroups).forEach(([weekStart, weekRecords]) => {
			// Use all records (no filtering by qualified agents)
			const weekClassifications = countClassifications(weekRecords)

			// Reviewed records = records with classification (not null)
			const weekReviewedRecords = weekRecords.filter(r => r.change_classification !== null)

			// AI Errors = critical_error + meaningful_improvement (from reviewed only)
			const weekAiErrors = weekReviewedRecords.filter(
				r => r.change_classification === 'critical_error' ||
				     r.change_classification === 'meaningful_improvement'
			).length

			// AI Quality = no_significant_change + stylistic_preference (from reviewed only)
			const weekAiQuality = weekReviewedRecords.filter(
				r => r.change_classification === 'no_significant_change' ||
				     r.change_classification === 'stylistic_preference'
			).length

			const weekStartDate = new Date(weekStart)
			const weekEndDate = new Date(weekStartDate)
			weekEndDate.setDate(weekEndDate.getDate() + 6)

			const dateRange = `${formatDate(weekStartDate)} — ${formatDate(
				weekEndDate
			)}`

			rows.push({
				category: group.category,
				version: group.version,
				dates: dateRange,
				sortOrder: 2,
				totalRecords: weekRecords.length,
				reviewedRecords: weekReviewedRecords.length,
				aiErrors: weekAiErrors,
				aiQuality: weekAiQuality,
				...weekClassifications,
			})
		})
	})

	// Sort: category ASC, sortOrder ASC, version DESC (newest first), dates DESC (newest first)
	return rows.sort((a, b) => {
		if (a.category !== b.category) return a.category.localeCompare(b.category)
		if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
		if (a.version !== b.version) {
			return extractVersionNumber(b.version) - extractVersionNumber(a.version)
		}

		// For dates, parse DD.MM.YYYY format and compare as actual dates (newest first)
		if (a.dates && b.dates) {
			// Extract first date from "DD.MM.YYYY — DD.MM.YYYY" format
			const dateStrA = a.dates.split(' — ')[0]
			const dateStrB = b.dates.split(' — ')[0]

			// Convert DD.MM.YYYY to YYYY-MM-DD for proper comparison
			const [dayA, monthA, yearA] = dateStrA.split('.')
			const [dayB, monthB, yearB] = dateStrB.split('.')
			const dateA = new Date(`${yearA}-${monthA}-${dayA}`)
			const dateB = new Date(`${yearB}-${monthB}-${dayB}`)

			// Descending order (newest first)
			return dateB.getTime() - dateA.getTime()
		}

		return 0
	})
}

/**
 * Format date as DD.MM.YYYY
 */
function formatDate(date: Date): string {
	const day = String(date.getDate()).padStart(2, '0')
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const year = date.getFullYear()
	return `${day}.${month}.${year}`
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
 * Fetch Detailed Stats with server-side PAGINATION (using SQL RPC)
 * Returns paginated table data (50 rows per page by default)
 */
export async function getDetailedStatsPaginated(
	filters: DashboardFilters,
	page: number = 0,
	pageSize: number = 50
): Promise<{
	data: DetailedStatsRow[]
	totalCount: number
	totalPages: number
	currentPage: number
	hasNextPage: boolean
	hasPreviousPage: boolean
}> {
	const { dateRange, versions, categories } = filters

	// @ts-expect-error - Supabase RPC types not fully generated yet
	const { data, error} = await supabase.rpc('get_detailed_stats_paginated', {
		p_from_date: dateRange.from.toISOString(),
		p_to_date: dateRange.to.toISOString(),
		p_versions: versions.length > 0 ? versions : null,
		p_categories: categories.length > 0 ? categories : null,
		p_page: page,
		p_page_size: pageSize,
	})

	if (error) throw error
	// @ts-expect-error - data type inferred as never but we know it's an array
	if (!data || data.length === 0) {
		return {
			data: [],
			totalCount: 0,
			totalPages: 0,
			currentPage: page,
			hasNextPage: false,
			hasPreviousPage: false,
		}
	}

	// SQL function returns out_total_count in every row (for efficiency)
	// @ts-expect-error - accessing dynamic SQL result fields
	const totalCount = data[0].out_total_count || 0
	const totalPages = Math.ceil(totalCount / pageSize)

	// Map SQL results to DetailedStatsRow type
	// Note: SQL function returns fields with 'out_' prefix to avoid ambiguity
	// @ts-expect-error - data.map exists but type is inferred as never
	const rows: DetailedStatsRow[] = data.map((row: unknown) => {
		const r = row as Record<string, unknown>

		// Legacy classification counts
		const criticalErrors = Number(r.out_critical_errors || 0)
		const meaningfulImprovements = Number(r.out_meaningful_improvements || 0)
		const stylisticPreferences = Number(r.out_stylistic_preferences || 0)
		const noSignificantChanges = Number(r.out_no_significant_changes || 0)
		const contextShifts = Number(r.out_context_shifts || 0)

		// New classification counts (from SQL if available, otherwise 0)
		const newCriticalFactErrors = Number(r.out_critical_fact_errors || 0)
		const newMajorFunctionalOmissions = Number(r.out_major_functional_omissions || 0)
		const newMinorInfoGaps = Number(r.out_minor_info_gaps || 0)
		const newConfusingVerbosity = Number(r.out_confusing_verbosity || 0)
		const newTonalMisalignments = Number(r.out_tonal_misalignments || 0)
		const newStructuralFixes = Number(r.out_structural_fixes || 0)
		const newStylisticEdits = Number(r.out_stylistic_edits || 0)
		const newPerfectMatches = Number(r.out_perfect_matches || 0)
		const newExclWorkflowShifts = Number(r.out_excl_workflow_shifts || 0)
		const newExclDataDiscrepancies = Number(r.out_excl_data_discrepancies || 0)

		return {
			category: (r.out_category as string) || 'unknown',
			version: (r.out_version as string) || 'unknown',
			dates: r.out_dates as string | null,
			sortOrder: r.out_sort_order as number,
			totalRecords: Number(r.out_total_records),
			reviewedRecords: Number(r.out_reviewed_records || 0),
			aiErrors: Number(r.out_ai_errors || 0),
			aiQuality: Number(r.out_ai_quality || 0),
			// Legacy classifications
			criticalErrors,
			meaningfulImprovements,
			stylisticPreferences,
			noSignificantChanges,
			contextShifts,
			// New classifications - combine direct + mapped legacy for unified view
			// critical_error -> CRITICAL_FACT_ERROR
			criticalFactErrors: newCriticalFactErrors + criticalErrors,
			// (no legacy maps to MAJOR_FUNCTIONAL_OMISSION)
			majorFunctionalOmissions: newMajorFunctionalOmissions,
			// meaningful_improvement -> MINOR_INFO_GAP
			minorInfoGaps: newMinorInfoGaps + meaningfulImprovements,
			// (no legacy maps to these)
			confusingVerbosity: newConfusingVerbosity,
			tonalMisalignments: newTonalMisalignments,
			structuralFixes: newStructuralFixes,
			// stylistic_preference -> STYLISTIC_EDIT
			stylisticEdits: newStylisticEdits + stylisticPreferences,
			// no_significant_change -> PERFECT_MATCH
			perfectMatches: newPerfectMatches + noSignificantChanges,
			// context_shift -> EXCL_WORKFLOW_SHIFT
			exclWorkflowShifts: newExclWorkflowShifts + contextShifts,
			// (no legacy maps to EXCL_DATA_DISCREPANCY)
			exclDataDiscrepancies: newExclDataDiscrepancies,
			// Average score (not calculated in SQL yet)
			averageScore: null,
		}
	})

	return {
		data: rows,
		totalCount,
		totalPages,
		currentPage: page,
		hasNextPage: page < totalPages - 1,
		hasPreviousPage: page > 0,
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
