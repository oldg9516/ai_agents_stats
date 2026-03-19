import { db } from '../index'
import { sql } from 'drizzle-orm'
import type { DashboardFilters, DateFilterMode, KPIData } from '@/lib/db/types'
import { calculateTrend, getPreviousPeriod } from './utils'

/**
 * Fetch KPI Data with trends using SQL RPC functions
 * This bypasses the 1000 row limit by aggregating on the database side
 * @param filters - Dashboard filters
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 * @param includedThreadIds - Thread IDs to INCLUDE (whitelist for requires_system_action filter)
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
		db.execute(sql`SELECT * FROM get_kpi_stats(
			p_from_date := ${dateRange.from.toISOString()}::timestamptz,
			p_to_date := ${dateRange.to.toISOString()}::timestamptz,
			p_versions := ${versions.length > 0 ? sql`ARRAY[${sql.join(versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_categories := ${categories.length > 0 ? sql`ARRAY[${sql.join(categories.map(c => sql`${c}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_agents := ${agents && agents.length > 0 ? sql`ARRAY[${sql.join(agents.map(a => sql`${a}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_date_field := ${dateField}::text,
			p_included_thread_ids := ${includedParam ? sql`ARRAY[${sql.join(includedParam.map(id => sql`${id}`), sql`, `)}]::text[]` : sql`NULL::text[]`}
		)`),
		// Previous period KPI stats
		db.execute(sql`SELECT * FROM get_kpi_stats(
			p_from_date := ${previousPeriod.from.toISOString()}::timestamptz,
			p_to_date := ${previousPeriod.to.toISOString()}::timestamptz,
			p_versions := ${versions.length > 0 ? sql`ARRAY[${sql.join(versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_categories := ${categories.length > 0 ? sql`ARRAY[${sql.join(categories.map(c => sql`${c}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_agents := ${agents && agents.length > 0 ? sql`ARRAY[${sql.join(agents.map(a => sql`${a}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_date_field := ${dateField}::text,
			p_included_thread_ids := ${includedParam ? sql`ARRAY[${sql.join(includedParam.map(id => sql`${id}`), sql`, `)}]::text[]` : sql`NULL::text[]`}
		)`),
		// Current period best category
		db.execute(sql`SELECT * FROM get_best_category(
			p_from_date := ${dateRange.from.toISOString()}::timestamptz,
			p_to_date := ${dateRange.to.toISOString()}::timestamptz,
			p_versions := ${versions.length > 0 ? sql`ARRAY[${sql.join(versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_categories := ${categories.length > 0 ? sql`ARRAY[${sql.join(categories.map(c => sql`${c}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_agents := ${agents && agents.length > 0 ? sql`ARRAY[${sql.join(agents.map(a => sql`${a}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_date_field := ${dateField}::text,
			p_included_thread_ids := ${includedParam ? sql`ARRAY[${sql.join(includedParam.map(id => sql`${id}`), sql`, `)}]::text[]` : sql`NULL::text[]`}
		)`),
	])

	// Extract stats from results
	const currentStats = (currentStatsResult.rows[0] as Record<string, unknown>) || {
		total_records: 0,
		reviewed_records: 0,
		context_shift_records: 0,
		quality_records: 0,
		changed_records: 0,
	}
	const previousStats = (previousStatsResult.rows[0] as Record<string, unknown>) || {
		total_records: 0,
		reviewed_records: 0,
		context_shift_records: 0,
		quality_records: 0,
		changed_records: 0,
	}
	const bestCategory = (currentBestCategoryResult.rows[0] as Record<string, unknown>) || {
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
		const previousBestCategoryForCategory = await db.execute(sql`SELECT * FROM get_best_category(
			p_from_date := ${previousPeriod.from.toISOString()}::timestamptz,
			p_to_date := ${previousPeriod.to.toISOString()}::timestamptz,
			p_versions := ${versions.length > 0 ? sql`ARRAY[${sql.join(versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_categories := ${sql`ARRAY[${sql`${bestCategory.category as string}`}]::text[]`},
			p_agents := ${agents && agents.length > 0 ? sql`ARRAY[${sql.join(agents.map(a => sql`${a}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_date_field := ${dateField}::text,
			p_included_thread_ids := ${includedParam ? sql`ARRAY[${sql.join(includedParam.map(id => sql`${id}`), sql`, `)}]::text[]` : sql`NULL::text[]`}
		)`)

		if (previousBestCategoryForCategory.rows[0]) {
			const row = previousBestCategoryForCategory.rows[0] as Record<string, unknown>
			previousCategoryPercentage = Number(row.quality_percentage) || 0
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
			category: (bestCategory.category as string) || '',
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
