'use server'

/**
 * Agent Stats Server Actions
 *
 * Server-side functions for fetching agent statistics
 * Shows how efficiently each agent uses AI drafts
 *
 * Uses RPC function `get_agent_stats` for single-query performance
 * instead of multiple sequential HTTP requests
 */

import { db } from '@/lib/db'
import { aiHumanComparison } from '@/lib/db/schema'
import { sql, and, eq, gte, lt, ne, inArray, isNotNull, desc, count } from 'drizzle-orm'
import {
	CRITICAL_CHANGE_CLASSIFICATIONS,
	UNNECESSARY_CHANGE_CLASSIFICATIONS,
} from '@/constants/classification-types'
import type {
	AgentStatsFilters,
	AgentStatsRow,
	AgentChangeTicket,
	AgentChangeType,
} from '@/lib/db/types'

// =============================================================================
// TYPES
// =============================================================================

type RpcAgentStatsRow = {
	email: string
	answered_tickets: number
	ai_reviewed: number
	changed: number
	critical_errors: number
	unnecessary_changes_pct: number
	ai_efficiency: number
	avg_response_time: number
	median_response_time: number
	p90_response_time: number
}

type PaginatedTicketsResult = {
	data: AgentChangeTicket[]
	total: number
}

// =============================================================================
// FETCH AGENT STATS
// =============================================================================

/**
 * Fetch agent statistics via RPC (single database query)
 *
 * Replaces 40+ sequential HTTP requests with one PostgreSQL function call.
 * The RPC handles all JOINs, aggregation, and percentile calculations server-side.
 */
export async function fetchAgentStats(
	filters: AgentStatsFilters
): Promise<{ success: true; data: AgentStatsRow[] } | { success: false; error: string }> {
	try {
		const startTime = Date.now()
		const { dateRange, versions, categories } = filters

		const result = await db.execute(sql`SELECT * FROM get_agent_stats(
			p_date_from := ${dateRange.from.toISOString()}::timestamptz,
			p_date_to := ${dateRange.to.toISOString()}::timestamptz,
			p_versions := ${versions.length > 0 ? sql`ARRAY[${sql.join(versions.map(v => sql`${v}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_categories := ${categories.length > 0 ? sql`ARRAY[${sql.join(categories.map(c => sql`${c}`), sql`, `)}]::text[]` : sql`NULL::text[]`},
			p_critical_classifications := ${sql`ARRAY[${sql.join(CRITICAL_CHANGE_CLASSIFICATIONS.map(c => sql`${c}`), sql`, `)}]::text[]`},
			p_excluded_email := ${'api@levhaolam.com'}::text
		)`)

		const data = result.rows as unknown as RpcAgentStatsRow[]

		const agentStats: AgentStatsRow[] = (data || []).map(row => ({
			email: row.email,
			answeredTickets: Number(row.answered_tickets),
			aiReviewed: Number(row.ai_reviewed),
			changed: Number(row.changed),
			criticalErrors: Number(row.critical_errors),
			unnecessaryChangesPercent: Number(row.unnecessary_changes_pct),
			aiEfficiency: Number(row.ai_efficiency),
			avgResponseTime: Number(row.avg_response_time),
			medianResponseTime: Number(row.median_response_time),
			p90ResponseTime: Number(row.p90_response_time),
		}))

		const duration = Date.now() - startTime
		console.log(`[AgentStats] Fetched ${agentStats.length} agents via RPC in ${duration}ms`)

		return { success: true, data: agentStats }
	} catch (error) {
		console.error('❌ [AgentStats] Error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch agent stats',
		}
	}
}

// =============================================================================
// FETCH AGENT CHANGE TICKETS (for modal)
// =============================================================================

/**
 * Fetch agent's change tickets for modal display
 *
 * @param agentEmail - Agent's email
 * @param filters - Date range and optional filters
 * @param changeType - Type of changes to fetch ('all', 'critical', 'unnecessary')
 * @param page - Page number (0-indexed)
 * @param pageSize - Records per page
 */
export async function fetchAgentChangeTickets(
	agentEmail: string,
	filters: AgentStatsFilters,
	changeType: AgentChangeType,
	page: number = 0,
	pageSize: number = 20
): Promise<{ success: true; data: PaginatedTicketsResult } | { success: false; error: string }> {
	try {
		const { dateRange, versions, categories } = filters
		const offset = page * pageSize

		// Build conditions array
		const conditions = [
			eq(aiHumanComparison.email, agentEmail),
			eq(aiHumanComparison.changed, true),
			isNotNull(aiHumanComparison.changeClassification),
			gte(aiHumanComparison.createdAt, dateRange.from),
			lt(aiHumanComparison.createdAt, dateRange.to),
		]

		// Apply change type filter
		if (changeType === 'critical') {
			conditions.push(inArray(aiHumanComparison.changeClassification, CRITICAL_CHANGE_CLASSIFICATIONS))
		} else if (changeType === 'unnecessary') {
			conditions.push(inArray(aiHumanComparison.changeClassification, UNNECESSARY_CHANGE_CLASSIFICATIONS))
		}

		// Apply optional filters
		if (versions.length > 0) {
			conditions.push(inArray(aiHumanComparison.promptVersion, versions))
		}
		if (categories.length > 0) {
			conditions.push(inArray(aiHumanComparison.requestSubtype, categories))
		}

		const whereClause = and(...conditions)

		const [data, countResult] = await Promise.all([
			db
				.select({
					id: aiHumanComparison.id,
					ticket_id: aiHumanComparison.ticketId,
					email: aiHumanComparison.email,
					change_classification: aiHumanComparison.changeClassification,
					created_at: aiHumanComparison.createdAt,
					request_subtype: aiHumanComparison.requestSubtype,
					prompt_version: aiHumanComparison.promptVersion,
				})
				.from(aiHumanComparison)
				.where(whereClause)
				.orderBy(desc(aiHumanComparison.createdAt))
				.limit(pageSize)
				.offset(offset),
			db
				.select({ value: count() })
				.from(aiHumanComparison)
				.where(whereClause),
		])

		return {
			success: true,
			data: {
				data: (data || []).map(row => ({
					...row,
					created_at: row.created_at?.toISOString() ?? '',
				})) as AgentChangeTicket[],
				total: countResult[0]?.value ?? 0,
			},
		}
	} catch (error) {
		console.error('❌ [AgentChangeTickets] Error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch tickets',
		}
	}
}
