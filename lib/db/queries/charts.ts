import { db } from '../index'
import { sql, and, gte, lt, isNotNull, inArray, ne } from 'drizzle-orm'
import { aiHumanComparison } from '../schema'
import type {
	CategoryDistributionResult,
	DashboardFilters,
	DateFilterMode,
	QualityTrendData,
	VersionComparisonData,
} from '@/lib/db/types'
import { extractVersionNumber, getDayStart, getWeekStart, isAiQualityClassification } from './utils'

/**
 * Fetch Quality Trends data (for line chart)
 * Uses only reviewed records (change_classification IS NOT NULL)
 * Single query with direct pg - no batching needed
 * @param filters - Dashboard filters (with optional includedThreadIds for requires_system_action filter)
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function getQualityTrends(
	filters: DashboardFilters & { includedThreadIds?: string[] },
	dateFilterMode: DateFilterMode = 'created'
): Promise<QualityTrendData[]> {
	const { dateRange, versions, categories, agents, includedThreadIds } = filters

	// Build conditions
	const dateColumn = dateFilterMode === 'human_reply'
		? aiHumanComparison.humanReplyDate
		: aiHumanComparison.createdAt

	const conditions = [
		gte(dateColumn, dateRange.from),
		lt(dateColumn, dateRange.to),
		isNotNull(aiHumanComparison.changeClassification),
		ne(aiHumanComparison.email, 'api@levhaolam.com'),
	]

	if (versions.length > 0) {
		conditions.push(inArray(aiHumanComparison.promptVersion, versions))
	}
	if (categories.length > 0) {
		conditions.push(inArray(aiHumanComparison.requestSubtype, categories))
	}
	if (agents && agents.length > 0) {
		conditions.push(inArray(aiHumanComparison.email, agents))
	}
	if (dateFilterMode === 'human_reply') {
		conditions.push(isNotNull(aiHumanComparison.humanReplyDate))
	}
	// INCLUDE ONLY thread_ids matching requires_system_action filter
	if (includedThreadIds && includedThreadIds.length > 0) {
		conditions.push(inArray(aiHumanComparison.threadId, includedThreadIds))
	}

	// Single query - no batching needed with direct pg
	const records = await db
		.select({
			threadId: aiHumanComparison.threadId,
			requestSubtype: aiHumanComparison.requestSubtype,
			createdAt: aiHumanComparison.createdAt,
			humanReplyDate: aiHumanComparison.humanReplyDate,
			changed: aiHumanComparison.changed,
			changeClassification: aiHumanComparison.changeClassification,
		})
		.from(aiHumanComparison)
		.where(and(...conditions))

	if (!records.length) return []

	// Filter out context_shift records before calculations
	const evaluableRecords = records.filter(
		r => r.changeClassification !== 'context_shift'
	)

	// Calculate date range in days
	const diffMs = dateRange.to.getTime() - dateRange.from.getTime()
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
	const groupByDay = diffDays <= 14 // Use day grouping for periods <= 14 days

	// Group by category and day/week (only evaluable records)
	const grouped = evaluableRecords.reduce((acc, record) => {
		const category = record.requestSubtype ?? 'unknown'
		// Use appropriate date field based on mode
		const dateValue = dateFilterMode === 'human_reply'
			? record.humanReplyDate
			: record.createdAt
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
 * Uses RPC function to aggregate on database side
 * @param filters - Dashboard filters
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 * @param includedThreadIds - Thread IDs to INCLUDE (whitelist for requires_system_action filter)
 */
export async function getCategoryDistribution(
	filters: DashboardFilters,
	dateFilterMode: DateFilterMode = 'created',
	includedThreadIds?: string[]
): Promise<CategoryDistributionResult> {
	const { dateRange, versions, categories, agents } = filters

	const result = await db.execute(sql`SELECT * FROM get_category_distribution(
		p_from_date := ${dateRange.from.toISOString()}::timestamptz,
		p_to_date := ${dateRange.to.toISOString()}::timestamptz,
		p_versions := ${versions.length > 0 ? sql`ARRAY[${sql.join(versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_categories := ${categories.length > 0 ? sql`ARRAY[${sql.join(categories.map(c => sql`${c}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_agents := ${agents && agents.length > 0 ? sql`ARRAY[${sql.join(agents.map(a => sql`${a}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_date_field := ${dateFilterMode === 'human_reply' ? 'human_reply_date' : 'created_at'}::text,
		p_included_thread_ids := ${includedThreadIds && includedThreadIds.length > 0 ? sql`ARRAY[${sql.join(includedThreadIds.map(id => sql`${id}`), sql`, `)}]::text[]` : sql`NULL::text[]`}
	)`)

	if (!result.rows || result.rows.length === 0) {
		return { categories: [], totalCount: 0 }
	}

	// RPC returns array of { category, total_records, unchanged_records }
	const rpcData = result.rows as unknown as Array<{
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
 * Single query with direct pg - no batching needed
 * @param filters - Dashboard filters (with optional includedThreadIds for requires_system_action filter)
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function getVersionComparison(
	filters: DashboardFilters & { includedThreadIds?: string[] },
	dateFilterMode: DateFilterMode = 'created'
): Promise<VersionComparisonData[]> {
	const { dateRange, versions, categories, agents, includedThreadIds } = filters

	// Build conditions
	const dateColumn = dateFilterMode === 'human_reply'
		? aiHumanComparison.humanReplyDate
		: aiHumanComparison.createdAt

	const conditions = [
		gte(dateColumn, dateRange.from),
		lt(dateColumn, dateRange.to),
		ne(aiHumanComparison.email, 'api@levhaolam.com'),
	]

	if (versions.length > 0) {
		conditions.push(inArray(aiHumanComparison.promptVersion, versions))
	}
	if (categories.length > 0) {
		conditions.push(inArray(aiHumanComparison.requestSubtype, categories))
	}
	if (agents && agents.length > 0) {
		conditions.push(inArray(aiHumanComparison.email, agents))
	}
	if (dateFilterMode === 'human_reply') {
		conditions.push(isNotNull(aiHumanComparison.humanReplyDate))
	}
	if (includedThreadIds && includedThreadIds.length > 0) {
		conditions.push(inArray(aiHumanComparison.threadId, includedThreadIds))
	}

	// Single query - no batching needed with direct pg
	const records = await db
		.select({
			threadId: aiHumanComparison.threadId,
			promptVersion: aiHumanComparison.promptVersion,
			changed: aiHumanComparison.changed,
			changeClassification: aiHumanComparison.changeClassification,
		})
		.from(aiHumanComparison)
		.where(and(...conditions))

	if (!records.length) return []

	// Filter to only reviewed records, excluding context_shift and exclusion types
	const evaluableRecords = records.filter(
		r => r.changeClassification !== null &&
			r.changeClassification !== 'context_shift' &&
			r.changeClassification !== 'EXCL_WORKFLOW_SHIFT' &&
			r.changeClassification !== 'EXCL_DATA_DISCREPANCY'
	)

	// Group by version (only evaluable records)
	const grouped = evaluableRecords.reduce((acc, record) => {
		const ver = record.promptVersion ?? 'unknown'
		if (!acc[ver]) {
			acc[ver] = { total: 0, unchanged: 0 }
		}
		acc[ver].total++
		// Use classification-based quality check instead of 'changed' boolean
		if (isAiQualityClassification(record.changeClassification)) acc[ver].unchanged++
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
