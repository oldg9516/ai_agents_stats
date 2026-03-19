/**
 * Support Chart Queries
 * Status distribution, resolution time, sankey, and correlation matrix
 *
 * Uses SQL RPC functions for server-side aggregation (no record limit issues)
 */

import { db } from '../index'
import { sql } from 'drizzle-orm'
import type {
	CorrelationCell,
	ResolutionTimeData,
	SankeyData,
	StatusDistribution,
	SupportFilters,
} from '@/lib/db/types'
import { buildFilterParams } from './utils'

/**
 * Fetch Status Distribution for pie chart
 * RPC returns: [{status, count, percentage}]
 */
export async function fetchStatusDistribution(
	filters: SupportFilters
): Promise<StatusDistribution[]> {
	const params = buildFilterParams(filters)

	const result = await db.execute(sql`SELECT * FROM get_support_status_distribution(
		p_date_from := ${params.p_date_from}::timestamptz,
		p_date_to := ${params.p_date_to}::timestamptz,
		p_statuses := ${params.p_statuses ? sql`ARRAY[${sql.join(params.p_statuses.map(s => sql`${s}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_request_types := ${params.p_request_types ? sql`ARRAY[${sql.join(params.p_request_types.map(r => sql`${r}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_categories := ${params.p_categories ? sql`ARRAY[${sql.join(params.p_categories.map(c => sql`${c}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_requirements := ${params.p_requirements ? sql`ARRAY[${sql.join(params.p_requirements.map(r => sql`${r}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_versions := ${params.p_versions ? sql`ARRAY[${sql.join(params.p_versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`}
	)`)

	return (result.rows || []) as unknown as StatusDistribution[]
}

/**
 * Fetch Resolution Time data for bar chart
 * Shows average agent response time grouped by week
 * RPC returns: [{week_start, avg_resolution_time, thread_count}]
 */
export async function fetchResolutionTimeData(
	filters: SupportFilters
): Promise<ResolutionTimeData[]> {
	const result = await db.execute(sql`SELECT * FROM get_support_resolution_time(
		p_date_from := ${filters.dateRange.from.toISOString()}::timestamptz,
		p_date_to := ${filters.dateRange.to.toISOString()}::timestamptz
	)`)

	// Map snake_case SQL columns to camelCase TS interface
	return (result.rows || []).map(
		(row: Record<string, unknown>) => ({
			weekStart: row.week_start as string,
			avgResolutionTime: Number(row.avg_resolution_time),
			threadCount: Number(row.thread_count),
		})
	)
}

/**
 * Fetch Sankey Data for AI draft flow
 * Shows: AI Draft Created -> Used/Edited/Rejected -> Outcomes
 * RPC returns 6 counts, TS builds nodes/links (UI logic)
 */
export async function fetchSankeyData(
	filters: SupportFilters
): Promise<SankeyData> {
	const params = buildFilterParams(filters)

	const result = await db.execute(sql`SELECT * FROM get_support_sankey_data(
		p_date_from := ${params.p_date_from}::timestamptz,
		p_date_to := ${params.p_date_to}::timestamptz,
		p_statuses := ${params.p_statuses ? sql`ARRAY[${sql.join(params.p_statuses.map(s => sql`${s}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_request_types := ${params.p_request_types ? sql`ARRAY[${sql.join(params.p_request_types.map(r => sql`${r}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_categories := ${params.p_categories ? sql`ARRAY[${sql.join(params.p_categories.map(c => sql`${c}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_requirements := ${params.p_requirements ? sql`ARRAY[${sql.join(params.p_requirements.map(r => sql`${r}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_versions := ${params.p_versions ? sql`ARRAY[${sql.join(params.p_versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`}
	)`)

	const row = (result.rows[0] as Record<string, unknown>) || {
		created: 0,
		used_as_is: 0,
		edited: 0,
		rejected: 0,
		resolved: 0,
		pending: 0,
	}

	const flowCounts = {
		created: Number(row.created),
		usedAsIs: Number(row.used_as_is),
		edited: Number(row.edited),
		rejected: Number(row.rejected),
		resolved: Number(row.resolved),
		pending: Number(row.pending),
	}

	const nodes: SankeyData['nodes'] = [
		{ id: 'created', label: 'AI Draft Created' },
		{ id: 'used', label: 'Used As-Is' },
		{ id: 'edited', label: 'Edited' },
		{ id: 'rejected', label: 'Rejected' },
		{ id: 'resolved', label: 'Resolved' },
		{ id: 'pending', label: 'Pending' },
	]

	const links: SankeyData['links'] = [
		{ source: 'created', target: 'used', value: flowCounts.usedAsIs },
		{ source: 'created', target: 'edited', value: flowCounts.edited },
		{ source: 'created', target: 'rejected', value: flowCounts.rejected },
		{
			source: 'used',
			target: 'resolved',
			value: Math.floor(flowCounts.resolved / 2),
		},
		{
			source: 'edited',
			target: 'resolved',
			value: Math.floor(flowCounts.resolved / 2),
		},
		{
			source: 'used',
			target: 'pending',
			value: Math.floor(flowCounts.pending / 2),
		},
		{
			source: 'edited',
			target: 'pending',
			value: Math.floor(flowCounts.pending / 2),
		},
	]

	// Filter out zero-value links
	const filteredLinks = links.filter(link => link.value > 0)

	return { nodes, links: filteredLinks }
}

/**
 * Fetch Correlation Matrix for requirements heatmap
 * Shows which requirements frequently occur together
 * RPC returns: [{x, y, value}] -- 25 rows (5x5 matrix)
 */
export async function fetchCorrelationMatrix(
	filters: SupportFilters
): Promise<CorrelationCell[]> {
	// For correlation matrix, we don't apply requirements filter (we want all combinations)
	const params = buildFilterParams({ ...filters, requirements: [] })

	const result = await db.execute(sql`SELECT * FROM get_support_correlation_matrix(
		p_date_from := ${params.p_date_from}::timestamptz,
		p_date_to := ${params.p_date_to}::timestamptz,
		p_statuses := ${params.p_statuses ? sql`ARRAY[${sql.join(params.p_statuses.map(s => sql`${s}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_request_types := ${params.p_request_types ? sql`ARRAY[${sql.join(params.p_request_types.map(r => sql`${r}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_categories := ${params.p_categories ? sql`ARRAY[${sql.join(params.p_categories.map(c => sql`${c}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
		p_versions := ${params.p_versions ? sql`ARRAY[${sql.join(params.p_versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`}
	)`)

	return (result.rows || []) as unknown as CorrelationCell[]
}
