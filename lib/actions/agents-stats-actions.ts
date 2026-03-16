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

import { supabaseServer } from '@/lib/supabase/server'
import {
	CRITICAL_CHANGE_CLASSIFICATIONS,
	UNNECESSARY_CHANGE_CLASSIFICATIONS,
} from '@/constants/classification-types'
import type {
	AgentStatsFilters,
	AgentStatsRow,
	AgentChangeTicket,
	AgentChangeType,
} from '@/lib/supabase/types'

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

		const { data, error } = await (supabaseServer as any).rpc('get_agent_stats', {
			p_date_from: dateRange.from.toISOString(),
			p_date_to: dateRange.to.toISOString(),
			p_versions: versions.length > 0 ? versions : null,
			p_categories: categories.length > 0 ? categories : null,
			p_critical_classifications: CRITICAL_CHANGE_CLASSIFICATIONS,
			p_excluded_email: 'api@levhaolam.com',
		})

		if (error) throw error

		const result: AgentStatsRow[] = ((data || []) as RpcAgentStatsRow[]).map(row => ({
			email: row.email,
			answeredTickets: Number(row.answered_tickets),
			aiReviewed: Number(row.ai_reviewed),
			changed: Number(row.changed),
			criticalErrors: Number(row.critical_errors),
			unnecessaryChangesPercent: Number(row.unnecessary_changes_pct),
			aiEfficiency: Number(row.ai_efficiency),
			avgResponseTime: Number(row.avg_response_time),
			p90ResponseTime: Number(row.p90_response_time),
		}))

		const duration = Date.now() - startTime
		console.log(`[AgentStats] Fetched ${result.length} agents via RPC in ${duration}ms`)

		return { success: true, data: result }
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

		// Build base query
		let query = supabaseServer
			.from('ai_human_comparison')
			.select('id, ticket_id, email, change_classification, created_at, request_subtype, prompt_version', { count: 'exact' })
			.eq('email', agentEmail)
			.eq('changed', true)
			.not('change_classification', 'is', null)
			.gte('created_at', dateRange.from.toISOString())
			.lt('created_at', dateRange.to.toISOString())
			.order('created_at', { ascending: false })

		// Apply change type filter
		if (changeType === 'critical') {
			query = query.in('change_classification', CRITICAL_CHANGE_CLASSIFICATIONS)
		} else if (changeType === 'unnecessary') {
			query = query.in('change_classification', UNNECESSARY_CHANGE_CLASSIFICATIONS)
		}
		// 'all' - no additional filter, shows all changes

		// Apply optional filters
		if (versions.length > 0) {
			query = query.in('prompt_version', versions)
		}
		if (categories.length > 0) {
			query = query.in('request_subtype', categories)
		}

		// Apply pagination
		const offset = page * pageSize
		query = query.range(offset, offset + pageSize - 1)

		const { data, count, error } = await query

		if (error) throw error

		return {
			success: true,
			data: {
				data: (data || []) as AgentChangeTicket[],
				total: count || 0,
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
