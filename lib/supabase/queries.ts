import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { supabaseServer } from './server'
import type {
	AIHumanComparisonRow,
	CategoryDistributionData,
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
 * Fetch KPI Data with trends
 */
export async function getKPIData(filters: DashboardFilters): Promise<KPIData> {
	const { dateRange, versions, categories, agents } = filters
	const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

	// OPTIMIZATION: Select only fields needed for KPI calculation (not SELECT *)
	// This reduces data transfer significantly (only 2 fields instead of all)
	const selectFields = 'changed, request_subtype'

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

	// Apply email filter ONLY if agents array is not empty
	// agents: [] = ALL agents (no filter)
	// agents: [...QUALIFIED_AGENTS] = only qualified agents
	// agents: ['specific@email.com'] = specific agent
	if (agents.length > 0) {
		currentQuery = currentQuery.in('email', agents)
		previousQuery = previousQuery.in('email', agents)
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

	const [
		{ data: currentData, count: currentCount },
		{ data: previousData, count: previousCount },
	] = await Promise.all([currentQuery, previousQuery])

	if (!currentData || !previousData) {
		throw new Error('Failed to fetch KPI data')
	}

	// Type assertion after null check - only the fields we selected
	type KPIRecord = {
		changed: boolean
		request_subtype: string | null
	}
	const currentRecords = currentData as unknown as KPIRecord[]
	const previousRecords = previousData as unknown as KPIRecord[]

	// Calculate metrics - use count from query for accuracy
	const currentTotal = currentCount || 0
	const previousTotal = previousCount || 0

	const currentChanged = currentRecords.filter(r => r.changed).length
	const previousChanged = previousRecords.filter(r => r.changed).length

	const currentUnchanged = currentTotal - currentChanged
	const previousUnchanged = previousTotal - previousChanged

	const currentAvgQuality =
		currentTotal > 0 ? (currentUnchanged / currentTotal) * 100 : 0
	const previousAvgQuality =
		previousTotal > 0 ? (previousUnchanged / previousTotal) * 100 : 0

	// Calculate best category
	const categoryStats = currentRecords.reduce((acc, record) => {
		const cat = record.request_subtype ?? 'unknown'
		if (!acc[cat]) {
			acc[cat] = { total: 0, unchanged: 0 }
		}
		acc[cat].total++
		if (!record.changed) acc[cat].unchanged++
		return acc
	}, {} as Record<string, { total: number; unchanged: number }>)

	const bestCategory = Object.entries(categoryStats).reduce(
		(best, [cat, stats]) => {
			const percentage = (stats.unchanged / stats.total) * 100
			if (percentage > best.percentage) {
				return { category: cat, percentage }
			}
			return best
		},
		{ category: '', percentage: 0 }
	)

	// Calculate previous percentage for best category
	const previousCategoryData = previousRecords.filter(
		r => r.request_subtype === bestCategory.category
	)
	const previousCategoryTotal = previousCategoryData.length
	const previousCategoryUnchanged = previousCategoryData.filter(
		r => !r.changed
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
 */
export async function getQualityTrends(
	filters: DashboardFilters
): Promise<QualityTrendData[]> {
	const { dateRange, versions, categories, agents } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('request_subtype, created_at, changed')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	// Apply email filter ONLY if agents array is not empty
	if (agents.length > 0) {
		query = query.in('email', agents)
	}

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

	// Calculate date range in days
	const diffMs = dateRange.to.getTime() - dateRange.from.getTime()
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
	const groupByDay = diffDays <= 14 // Use day grouping for periods ≤ 14 days

	console.log('📊 Quality Trends Results:', {
		recordsFound: records.length,
		dateRange: `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`,
		diffDays,
		groupByDay: groupByDay ? 'DAY' : 'WEEK',
	})

	// Group by category and day/week
	const grouped = records.reduce((acc, record) => {
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
): Promise<CategoryDistributionData[]> {
	const { dateRange, versions, categories, agents } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('request_subtype, changed')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	// Apply email filter ONLY if agents array is not empty
	if (agents.length > 0) {
		query = query.in('email', agents)
	}

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

	console.log('🥧 Category Distribution Results:', {
		recordsFound: records.length,
		dateRange: `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`,
	})

	// Group by category
	const grouped = records.reduce((acc, record) => {
		const cat = record.request_subtype ?? 'unknown'
		if (!acc[cat]) {
			acc[cat] = { total: 0, unchanged: 0 }
		}
		acc[cat].total++
		if (!record.changed) acc[cat].unchanged++
		return acc
	}, {} as Record<string, { total: number; unchanged: number }>)

	return Object.entries(grouped).map(([category, stats]) => ({
		category,
		totalRecords: stats.total,
		goodPercentage: (stats.unchanged / stats.total) * 100,
	}))
}

/**
 * Fetch Version Comparison data (for bar chart)
 */
export async function getVersionComparison(
	filters: DashboardFilters
): Promise<VersionComparisonData[]> {
	const { dateRange, versions, categories, agents } = filters

	let query = supabase
		.from('ai_human_comparison')
		.select('prompt_version, changed')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	// Apply email filter ONLY if agents array is not empty
	if (agents.length > 0) {
		query = query.in('email', agents)
	}

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

	// Group by version
	const grouped = records.reduce((acc, record) => {
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
			goodPercentage: (stats.unchanged / stats.total) * 100,
		}))
		.sort((a, b) => a.version.localeCompare(b.version))
}

/**
 * Fetch Detailed Stats (for table)
 */
export async function getDetailedStats(
	filters: DashboardFilters
): Promise<DetailedStatsRow[]> {
	const { dateRange, versions, categories, agents } = filters

	// OPTIMIZATION: Select only fields needed for detailed stats calculation
	// This reduces data transfer significantly (5 fields instead of all)
	const selectFields =
		'created_at, email, changed, request_subtype, prompt_version'

	let query = supabase
		.from('ai_human_comparison')
		.select(selectFields)
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	// Apply email filter ONLY if agents array is not empty
	if (agents.length > 0) {
		query = query.in('email', agents)
	}

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

	// Process each version group
	Object.values(versionGroups).forEach(group => {
		// If agents filter is empty, use all records (no filtering by qualified agents)
		// Otherwise, filter by the specified agents list
		const qualifiedRecords = agents.length > 0
			? group.records.filter(r => r.email && agents.includes(r.email))
			: group.records
		const changedRecords = qualifiedRecords.filter(r => r.changed)
		const unchangedRecords = qualifiedRecords.filter(r => !r.changed)

		// Level 1: Version-level row
		rows.push({
			category: group.category,
			version: group.version,
			dates: null,
			sortOrder: 1,
			totalRecords: group.records.length,
			recordsQualifiedAgents: qualifiedRecords.length,
			changedRecords: changedRecords.length,
			goodPercentage:
				qualifiedRecords.length > 0
					? Math.round(
							(unchangedRecords.length / qualifiedRecords.length) * 100
					  )
					: 0,
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
			// If agents filter is empty, use all records (no filtering by qualified agents)
			// Otherwise, filter by the specified agents list
			const weekQualifiedRecords = agents.length > 0
				? weekRecords.filter(r => r.email && agents.includes(r.email))
				: weekRecords
			const weekChangedRecords = weekQualifiedRecords.filter(r => r.changed)
			const weekUnchangedRecords = weekQualifiedRecords.filter(r => !r.changed)

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
				recordsQualifiedAgents: weekQualifiedRecords.length,
				changedRecords: weekChangedRecords.length,
				goodPercentage:
					weekQualifiedRecords.length > 0
						? Math.round(
								(weekUnchangedRecords.length / weekQualifiedRecords.length) *
									100
						  )
						: 0,
			})
		})
	})

	// Sort: category ASC, sortOrder ASC, version ASC, dates DESC
	return rows.sort((a, b) => {
		if (a.category !== b.category) return a.category.localeCompare(b.category)
		if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
		if (a.version !== b.version) return a.version.localeCompare(b.version)
		if (a.dates && b.dates) return b.dates.localeCompare(a.dates)
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
	const { dateRange, versions, categories, agents } = filters

	// If agents array is empty, pass NULL to show ALL agents from database
	// Otherwise, pass the agent list (could be qualified agents or specific selection)
	const agentList = agents.length > 0 ? agents : null

	// @ts-expect-error - Supabase RPC types not fully generated yet
	const { data, error } = await supabase.rpc('get_detailed_stats_paginated', {
		p_from_date: dateRange.from.toISOString(),
		p_to_date: dateRange.to.toISOString(),
		p_versions: versions.length > 0 ? versions : null,
		p_categories: categories.length > 0 ? categories : null,
		p_agents: agentList,
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

	// SQL function returns total_count in every row (for efficiency)
	// @ts-expect-error - accessing dynamic SQL result fields
	const totalCount = data[0].total_count || 0
	const totalPages = Math.ceil(totalCount / pageSize)

	// Map SQL results to DetailedStatsRow type
	// @ts-expect-error - data.map exists but type is inferred as never
	const rows: DetailedStatsRow[] = data.map((row: unknown) => {
		const r = row as Record<string, unknown>
		return {
			category: (r.category as string) || 'unknown',
			version: (r.version as string) || 'unknown',
			dates: r.dates as string | null,
			sortOrder: r.sort_order as number,
			totalRecords: Number(r.total_records),
			recordsQualifiedAgents: Number(r.records_qualified_agents),
			changedRecords: Number(r.changed_records),
			goodPercentage: Number(r.good_percentage),
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
 * Get default filters (Last 30 days, all versions, all categories, ALL agents)
 */
export function getDefaultFilters(): DashboardFilters {
	const to = endOfDay(new Date())
	const from = startOfDay(subDays(to, 30))

	return {
		dateRange: { from, to },
		versions: [],
		categories: [],
		agents: [], // Empty array = ALL agents (no filter)
	}
}
