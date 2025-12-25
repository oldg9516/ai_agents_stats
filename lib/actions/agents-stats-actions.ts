'use server'

/**
 * Agent Stats Server Actions
 *
 * Server-side functions for fetching agent statistics
 * Shows how efficiently each agent uses AI drafts
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

type RawAgentRecord = {
	email: string
	human_reply: string | null
	change_classification: string | null
	changed: boolean | null
}

type PaginatedTicketsResult = {
	data: AgentChangeTicket[]
	total: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BATCH_SIZE = 1000
const MAX_CONCURRENT_BATCHES = 3
const REQUEST_TIMEOUT = 30000

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise(ms: number, operationName: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(
			() => reject(new Error(`${operationName} timed out after ${ms}ms`)),
			ms
		)
	)
}

// =============================================================================
// FETCH AGENT STATS
// =============================================================================

/**
 * Fetch agent statistics
 * Aggregates data by agent email to show:
 * - Answered tickets (human_reply IS NOT NULL)
 * - AI reviewed (change_classification IS NOT NULL)
 * - Changed (changed = true)
 * - Critical errors (real AI errors that needed fixing)
 * - Unnecessary changes % (agent changed but AI was correct)
 * - AI efficiency (100 - unnecessary %)
 */
export async function fetchAgentStats(
	filters: AgentStatsFilters
): Promise<{ success: true; data: AgentStatsRow[] } | { success: false; error: string }> {
	try {
		const startTime = Date.now()
		const { dateRange, versions, categories } = filters

		// Build base query
		let query = supabaseServer
			.from('ai_human_comparison')
			.select('email, human_reply, change_classification, changed', { count: 'exact' })
			.not('email', 'is', null)
			.gte('created_at', dateRange.from.toISOString())
			.lt('created_at', dateRange.to.toISOString())

		// Apply optional filters
		if (versions.length > 0) {
			query = query.in('prompt_version', versions)
		}
		if (categories.length > 0) {
			query = query.in('request_subtype', categories)
		}

		// First, get total count
		const { count, error: countError } = await query
		if (countError) throw countError

		const totalRecords = count || 0
		if (totalRecords === 0) {
			return { success: true, data: [] }
		}

		// Fetch all records in batches
		const allRecords: RawAgentRecord[] = []
		const numBatches = Math.ceil(totalRecords / BATCH_SIZE)

		for (let batchStart = 0; batchStart < numBatches; batchStart += MAX_CONCURRENT_BATCHES) {
			const batchPromises: Promise<RawAgentRecord[]>[] = []

			for (
				let i = batchStart;
				i < Math.min(batchStart + MAX_CONCURRENT_BATCHES, numBatches);
				i++
			) {
				const offset = i * BATCH_SIZE

				const promise = (async () => {
					let batchQuery = supabaseServer
						.from('ai_human_comparison')
						.select('email, human_reply, change_classification, changed')
						.not('email', 'is', null)
						.gte('created_at', dateRange.from.toISOString())
						.lt('created_at', dateRange.to.toISOString())
						.range(offset, offset + BATCH_SIZE - 1)

					if (versions.length > 0) {
						batchQuery = batchQuery.in('prompt_version', versions)
					}
					if (categories.length > 0) {
						batchQuery = batchQuery.in('request_subtype', categories)
					}

					const { data, error } = await batchQuery
					if (error) throw error
					return (data || []) as RawAgentRecord[]
				})()

				batchPromises.push(promise)
			}

			const results = await Promise.all(batchPromises)
			allRecords.push(...results.flat())

			// Small delay between batch groups
			if (batchStart + MAX_CONCURRENT_BATCHES < numBatches) {
				await new Promise(resolve => setTimeout(resolve, 50))
			}
		}

		// Aggregate by agent email
		const agentMap = new Map<string, {
			answeredTickets: number
			aiReviewed: number
			changed: number
			criticalErrors: number
		}>()

		for (const record of allRecords) {
			const email = record.email
			if (!email) continue

			const current = agentMap.get(email) || {
				answeredTickets: 0,
				aiReviewed: 0,
				changed: 0,
				criticalErrors: 0,
			}

			// Answered tickets - has human reply
			if (record.human_reply !== null) {
				current.answeredTickets++
			}

			// AI reviewed - has classification
			if (record.change_classification !== null) {
				current.aiReviewed++

				// Changed - agent modified AI output
				if (record.changed === true) {
					current.changed++
				}

				// Critical errors - real AI errors that needed fixing
				if (CRITICAL_CHANGE_CLASSIFICATIONS.includes(record.change_classification as never)) {
					current.criticalErrors++
				}
			}

			agentMap.set(email, current)
		}

		// Calculate percentages and build result
		const result: AgentStatsRow[] = []

		for (const [email, stats] of agentMap) {
			// Only include agents with AI reviewed records
			if (stats.aiReviewed === 0) continue

			// Unnecessary changes = changed but AI was correct
			// This is: changed - criticalErrors (where change_classification is in UNNECESSARY)
			const unnecessaryChanges = Math.max(0, stats.changed - stats.criticalErrors)
			const unnecessaryChangesPercent = stats.aiReviewed > 0
				? (unnecessaryChanges / stats.aiReviewed) * 100
				: 0

			const aiEfficiency = 100 - unnecessaryChangesPercent

			result.push({
				email,
				answeredTickets: stats.answeredTickets,
				aiReviewed: stats.aiReviewed,
				changed: stats.changed,
				criticalErrors: stats.criticalErrors,
				unnecessaryChangesPercent: Math.round(unnecessaryChangesPercent * 10) / 10,
				aiEfficiency: Math.round(aiEfficiency * 10) / 10,
			})
		}

		// Sort by AI efficiency (descending)
		result.sort((a, b) => b.aiEfficiency - a.aiEfficiency)

		const duration = Date.now() - startTime
		console.log(`[AgentStats] Fetched ${result.length} agents in ${duration}ms`)

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
