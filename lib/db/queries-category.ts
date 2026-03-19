/**
 * Category Detail Database Queries (Drizzle)
 *
 * Replaces Supabase direct table queries with Drizzle query builder.
 * No batch fetching needed — direct pg has no row limit.
 */

import { db } from './index'
import { and, gte, lt, eq, ne, inArray, desc, count } from 'drizzle-orm'
import { aiHumanComparison } from './schema'
import type {
	CategoryKPIData,
	CategoryWeeklyTrend,
	CategoryVersionStats,
	CategoryAgentStats,
	CategoryRecord,
	CategoryFilters,
} from './types'
import { calculateTrend, getPreviousPeriod } from './utils'
import { startOfWeek, endOfWeek, format } from 'date-fns'

/**
 * Build common WHERE conditions for category queries
 */
function buildCategoryConditions(
	categories: string[],
	dateFrom: Date,
	dateTo: Date,
	agents: string[],
	versions: string[]
) {
	const conditions = [
		inArray(aiHumanComparison.requestSubtype, categories),
		gte(aiHumanComparison.createdAt, dateFrom),
		lt(aiHumanComparison.createdAt, dateTo),
		ne(aiHumanComparison.email, 'api@levhaolam.com'),
	]
	if (agents.length > 0)
		conditions.push(inArray(aiHumanComparison.email, agents))
	if (versions.length > 0)
		conditions.push(inArray(aiHumanComparison.promptVersion, versions))
	return conditions
}

/**
 * Get KPI data for one or more categories
 * Two parallel queries (current + previous period), each a single SELECT
 */
export async function getCategoryKPIData(
	categories: string[],
	filters: CategoryFilters
): Promise<CategoryKPIData> {
	const { dateRange, versions, agents } = filters
	const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

	const [currentRecords, previousRecords] = await Promise.all([
		db
			.select({ changed: aiHumanComparison.changed })
			.from(aiHumanComparison)
			.where(
				and(
					...buildCategoryConditions(
						categories,
						dateRange.from,
						dateRange.to,
						agents,
						versions
					)
				)
			),
		db
			.select({ changed: aiHumanComparison.changed })
			.from(aiHumanComparison)
			.where(
				and(
					...buildCategoryConditions(
						categories,
						previousPeriod.from,
						previousPeriod.to,
						agents,
						versions
					)
				)
			),
	])

	const currentTotal = currentRecords.length
	const previousTotal = previousRecords.length

	const currentChanged = currentRecords.filter((r) => r.changed).length
	const previousChanged = previousRecords.filter((r) => r.changed).length

	const currentGood = currentTotal - currentChanged
	const previousGood = previousTotal - previousChanged

	const currentQuality =
		currentTotal > 0 ? (currentGood / currentTotal) * 100 : 0
	const previousQuality =
		previousTotal > 0 ? (previousGood / previousTotal) * 100 : 0

	return {
		totalRecords: {
			current: currentTotal,
			previous: previousTotal,
			trend: calculateTrend(currentTotal, previousTotal),
		},
		quality: {
			current: currentQuality,
			previous: previousQuality,
			trend: calculateTrend(currentQuality, previousQuality),
		},
		changed: {
			current: currentChanged,
			previous: previousChanged,
			trend: calculateTrend(currentChanged, previousChanged),
		},
	}
}

/**
 * Get weekly trend data for category
 * Single SELECT, then group in JS
 */
export async function getCategoryWeeklyTrends(
	categories: string[],
	filters: CategoryFilters
): Promise<CategoryWeeklyTrend[]> {
	const { dateRange, versions, agents } = filters

	const records = await db
		.select({
			createdAt: aiHumanComparison.createdAt,
			changed: aiHumanComparison.changed,
		})
		.from(aiHumanComparison)
		.where(
			and(
				...buildCategoryConditions(
					categories,
					dateRange.from,
					dateRange.to,
					agents,
					versions
				)
			)
		)

	// Group by week
	const weekMap = new Map<
		string,
		{ total: number; good: number; changed: number }
	>()

	records.forEach((record) => {
		if (!record.createdAt) return
		const date = new Date(record.createdAt)
		const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
		const weekKey = weekStart.toISOString()

		if (!weekMap.has(weekKey)) {
			weekMap.set(weekKey, { total: 0, good: 0, changed: 0 })
		}

		const weekData = weekMap.get(weekKey)!
		weekData.total++
		if (!record.changed) weekData.good++
		if (record.changed) weekData.changed++
	})

	// Convert to array and sort
	const trends: CategoryWeeklyTrend[] = Array.from(weekMap.entries())
		.map(([weekStartStr, stats]) => {
			const weekStart = new Date(weekStartStr)
			const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

			return {
				weekStart: weekStart.toISOString(),
				weekEnd: weekEnd.toISOString(),
				totalRecords: stats.total,
				goodRecords: stats.good,
				goodPercentage:
					stats.total > 0 ? (stats.good / stats.total) * 100 : 0,
				changedRecords: stats.changed,
			}
		})
		.sort((a, b) => a.weekStart.localeCompare(b.weekStart))

	return trends
}

/**
 * Get version breakdown stats for category
 * Single SELECT, then group in JS
 */
export async function getCategoryVersionStats(
	categories: string[],
	filters: CategoryFilters
): Promise<CategoryVersionStats[]> {
	const { dateRange, versions, agents } = filters

	const records = await db
		.select({
			promptVersion: aiHumanComparison.promptVersion,
			changed: aiHumanComparison.changed,
		})
		.from(aiHumanComparison)
		.where(
			and(
				...buildCategoryConditions(
					categories,
					dateRange.from,
					dateRange.to,
					agents,
					versions
				)
			)
		)

	// Group by version
	const versionMap = new Map<
		string,
		{ total: number; good: number; changed: number }
	>()

	records.forEach((record) => {
		const version = record.promptVersion || 'unknown'

		if (!versionMap.has(version)) {
			versionMap.set(version, { total: 0, good: 0, changed: 0 })
		}

		const versionData = versionMap.get(version)!
		versionData.total++
		if (!record.changed) versionData.good++
		if (record.changed) versionData.changed++
	})

	// Convert to array and sort by quality (descending)
	const stats: CategoryVersionStats[] = Array.from(versionMap.entries())
		.map(([version, data]) => ({
			version,
			totalRecords: data.total,
			goodRecords: data.good,
			goodPercentage:
				data.total > 0 ? (data.good / data.total) * 100 : 0,
			changedRecords: data.changed,
		}))
		.sort((a, b) => b.goodPercentage - a.goodPercentage)

	return stats
}

/**
 * Get agent breakdown stats for category
 * Single SELECT, then group in JS
 */
export async function getCategoryAgentStats(
	categories: string[],
	filters: CategoryFilters
): Promise<CategoryAgentStats[]> {
	const { dateRange, versions, agents } = filters

	const records = await db
		.select({
			email: aiHumanComparison.email,
			changed: aiHumanComparison.changed,
		})
		.from(aiHumanComparison)
		.where(
			and(
				...buildCategoryConditions(
					categories,
					dateRange.from,
					dateRange.to,
					agents,
					versions
				)
			)
		)

	// Group by agent
	const agentMap = new Map<
		string,
		{ total: number; good: number; changed: number }
	>()

	records.forEach((record) => {
		// Skip records without email
		if (!record.email) return

		const agent = record.email

		if (!agentMap.has(agent)) {
			agentMap.set(agent, { total: 0, good: 0, changed: 0 })
		}

		const agentData = agentMap.get(agent)!
		agentData.total++
		if (!record.changed) agentData.good++
		if (record.changed) agentData.changed++
	})

	// Convert to array and sort by quality (descending)
	const stats: CategoryAgentStats[] = Array.from(agentMap.entries())
		.map(([agent, data]) => ({
			agent,
			totalRecords: data.total,
			goodRecords: data.good,
			goodPercentage:
				data.total > 0 ? (data.good / data.total) * 100 : 0,
			changedRecords: data.changed,
		}))
		.sort((a, b) => b.goodPercentage - a.goodPercentage)

	return stats
}

/**
 * Get detailed records for category (with pagination)
 */
export async function getCategoryRecords(
	categories: string[],
	filters: CategoryFilters,
	pagination: { page: number; pageSize: number }
): Promise<{ data: CategoryRecord[]; total: number }> {
	const { dateRange, versions, agents } = filters
	const { page, pageSize } = pagination

	const conditions = buildCategoryConditions(
		categories,
		dateRange.from,
		dateRange.to,
		agents,
		versions
	)
	const whereClause = and(...conditions)

	// Parallel: data + count
	const [data, countResult] = await Promise.all([
		db
			.select({
				id: aiHumanComparison.id,
				ticketId: aiHumanComparison.ticketId,
				promptVersion: aiHumanComparison.promptVersion,
				createdAt: aiHumanComparison.createdAt,
				email: aiHumanComparison.email,
				changed: aiHumanComparison.changed,
				changeClassification: aiHumanComparison.changeClassification,
			})
			.from(aiHumanComparison)
			.where(whereClause)
			.orderBy(desc(aiHumanComparison.createdAt))
			.limit(pageSize)
			.offset(page * pageSize),
		db
			.select({ value: count() })
			.from(aiHumanComparison)
			.where(whereClause),
	])

	const records: CategoryRecord[] = data.map((record) => {
		const date = record.createdAt ? new Date(record.createdAt) : new Date()
		const weekStart = startOfWeek(date, { weekStartsOn: 1 })

		return {
			id: record.id,
			ticketId: record.ticketId,
			version: record.promptVersion || 'unknown',
			week: format(weekStart, 'MMM dd'),
			weekStart: weekStart.toISOString(),
			agent: record.email || '-',
			changed: record.changed ?? false,
			changeClassification: record.changeClassification,
			createdAt: record.createdAt?.toISOString() ?? '',
		}
	})

	return {
		data: records,
		total: Number(countResult[0]?.value ?? 0),
	}
}

/**
 * Check if category exists
 */
export async function categoryExists(
	categoryName: string
): Promise<boolean> {
	const [result] = await db
		.select({ value: count() })
		.from(aiHumanComparison)
		.where(eq(aiHumanComparison.requestSubtype, categoryName))
		.limit(1)

	return Number(result?.value ?? 0) > 0
}

