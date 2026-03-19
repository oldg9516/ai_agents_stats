import { db } from '../index'
import { sql, and, gte, lt } from 'drizzle-orm'
import { aiHumanComparison } from '../schema'
import { endOfTodayInIsrael, startOfNDaysAgoInIsrael } from '@/lib/utils/date-tz'
import type { DashboardFilters, FilterOptions } from '@/lib/db/types'

/**
 * Get minimum created_at date from database
 * Used for "All Time" filter preset
 */
export async function getMinCreatedDate(): Promise<Date> {
	const result = await db.execute(sql`SELECT * FROM get_min_created_date()`)

	const value = result.rows[0]?.get_min_created_date
	if (!value) return new Date('2020-01-01') // Fallback

	return new Date(value as string)
}

/**
 * Get filter options (versions, categories, and agents)
 * @param dateRange - Optional date range to filter options (only show options with records in this period)
 */
export async function getFilterOptions(dateRange?: {
	from: Date
	to: Date
}): Promise<FilterOptions> {
	// Get versions and categories from RPC
	const result = await db.execute(sql`SELECT * FROM get_filter_options(
		p_from_date := ${dateRange ? dateRange.from.toISOString() : null}::timestamptz,
		p_to_date := ${dateRange ? dateRange.to.toISOString() : null}::timestamptz
	)`)

	// Get agents separately using drizzle query builder
	const conditions = []
	if (dateRange) {
		conditions.push(gte(aiHumanComparison.createdAt, dateRange.from))
		conditions.push(lt(aiHumanComparison.createdAt, dateRange.to))
	}

	const agentsResult = await db
		.selectDistinct({ email: aiHumanComparison.email })
		.from(aiHumanComparison)
		.where(conditions.length > 0 ? and(...conditions) : undefined)

	// Extract unique agents (filter out nulls)
	const agents = agentsResult
		.map(r => r.email)
		.filter((email): email is string => email !== null)
		.sort()

	const row = result.rows[0] as Record<string, unknown> | undefined
	if (!row) return { versions: [], categories: [], agents }

	return {
		versions: (row.versions as string[] | null) || [],
		categories: (row.categories as string[] | null) || [],
		agents,
	}
}

/**
 * Get default filters (Last 30 days, all versions, all categories)
 */
export function getDefaultFilters(): DashboardFilters {
	return {
		dateRange: {
			from: startOfNDaysAgoInIsrael(29),
			to: endOfTodayInIsrael(),
		},
		versions: [],
		categories: [],
		agents: [],
	}
}
