'use server'

/**
 * Agent Stats Server Actions
 *
 * Server-side functions for fetching agent statistics
 * Shows how efficiently each agent uses AI drafts
 *
 * Data sources:
 * - Answered Tickets: from support_dialogs (direction='out', grouped by email)
 * - AI Reviewed/Changed/Critical: from ai_human_comparison
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

type RawComparisonRecord = {
	email: string
	change_classification: string | null
	changed: boolean | null
}

type DialogOutRecord = {
	email: string | null
	ticket_id: string | null
	date: string | null
}

type PaginatedTicketsResult = {
	data: AgentChangeTicket[]
	total: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BATCH_SIZE = 500
const MAX_CONCURRENT_BATCHES = 3

// =============================================================================
// FETCH AGENT STATS
// =============================================================================

/**
 * Fetch agent statistics
 *
 * Data sources:
 * - Answered Tickets: from support_dialogs where direction='out'
 *   Grouped by email, counted as unique responses after incoming message
 * - AI Reviewed: from ai_human_comparison (change_classification IS NOT NULL)
 * - Changed: from ai_human_comparison (changed = true)
 * - Critical: from ai_human_comparison (classification in CRITICAL list)
 */
export async function fetchAgentStats(
	filters: AgentStatsFilters
): Promise<{ success: true; data: AgentStatsRow[] } | { success: false; error: string }> {
	try {
		const startTime = Date.now()
		const { dateRange, versions, categories } = filters

		// =========================================================================
		// STEP 1: Fetch threads from support_threads_data (for filtering + ticket_id)
		// =========================================================================

		let threadsQuery = supabaseServer
			.from('support_threads_data')
			.select('thread_id, ticket_id', { count: 'exact' })
			.gte('thread_date', dateRange.from.toISOString())
			.lt('thread_date', dateRange.to.toISOString())
			.not('ticket_id', 'is', null)

		if (versions.length > 0) {
			threadsQuery = threadsQuery.in('prompt_version', versions)
		}
		if (categories.length > 0) {
			threadsQuery = threadsQuery.in('request_subtype', categories)
		}

		const { count: threadsCount, error: countError } = await threadsQuery
		if (countError) throw countError

		const totalThreads = threadsCount || 0
		if (totalThreads === 0) {
			return { success: true, data: [] }
		}

		// Fetch all threads in batches
		const allThreads: { thread_id: string; ticket_id: string }[] = []
		const numThreadBatches = Math.ceil(totalThreads / BATCH_SIZE)

		for (let batchStart = 0; batchStart < numThreadBatches; batchStart += MAX_CONCURRENT_BATCHES) {
			const batchPromises: Promise<{ thread_id: string; ticket_id: string }[]>[] = []

			for (
				let i = batchStart;
				i < Math.min(batchStart + MAX_CONCURRENT_BATCHES, numThreadBatches);
				i++
			) {
				const offset = i * BATCH_SIZE

				const promise = (async () => {
					let batchQuery = supabaseServer
						.from('support_threads_data')
						.select('thread_id, ticket_id')
						.gte('thread_date', dateRange.from.toISOString())
						.lt('thread_date', dateRange.to.toISOString())
						.not('ticket_id', 'is', null)
						.range(offset, offset + BATCH_SIZE - 1)

					if (versions.length > 0) {
						batchQuery = batchQuery.in('prompt_version', versions)
					}
					if (categories.length > 0) {
						batchQuery = batchQuery.in('request_subtype', categories)
					}

					const { data, error } = await batchQuery
					if (error) throw error
					return (data || []) as { thread_id: string; ticket_id: string }[]
				})()

				batchPromises.push(promise)
			}

			const results = await Promise.all(batchPromises)
			allThreads.push(...results.flat())

			if (batchStart + MAX_CONCURRENT_BATCHES < numThreadBatches) {
				await new Promise(resolve => setTimeout(resolve, 50))
			}
		}

		const threadIds = allThreads.map(t => t.thread_id)
		const ticketIds = [...new Set(allThreads.map(t => t.ticket_id).filter(Boolean))]

		// =========================================================================
		// STEP 2: Fetch incoming message dates from support_dialogs
		// =========================================================================

		const incomingDates = new Map<string, Date>()

		for (let i = 0; i < threadIds.length; i += BATCH_SIZE) {
			const batchIds = threadIds.slice(i, i + BATCH_SIZE)

			const { data, error } = await supabaseServer
				.from('support_dialogs')
				.select('thread_id, date')
				.in('thread_id', batchIds)
				.eq('direction', 'in')

			if (error) throw error

			for (const record of (data || []) as { thread_id: string; date: string }[]) {
				if (record.thread_id && record.date) {
					incomingDates.set(record.thread_id, new Date(record.date))
				}
			}

			if (i + BATCH_SIZE < threadIds.length) {
				await new Promise(resolve => setTimeout(resolve, 50))
			}
		}

		// =========================================================================
		// STEP 3: Fetch outgoing messages with email from support_dialogs
		// Count answered tickets per agent
		// =========================================================================

		// Map: email -> Set of thread_ids where agent responded
		const agentAnsweredThreads = new Map<string, Set<string>>()

		// Group threads by ticket_id
		const ticketToThreads = new Map<string, string[]>()
		for (const thread of allThreads) {
			if (!thread.ticket_id) continue
			const existing = ticketToThreads.get(thread.ticket_id) || []
			existing.push(thread.thread_id)
			ticketToThreads.set(thread.ticket_id, existing)
		}

		// Fetch outgoing messages with email
		for (let i = 0; i < ticketIds.length; i += BATCH_SIZE) {
			const batchTicketIds = ticketIds.slice(i, i + BATCH_SIZE)

			const { data, error } = await supabaseServer
				.from('support_dialogs')
				.select('email, ticket_id, date')
				.in('ticket_id', batchTicketIds)
				.eq('direction', 'out')
				.not('email', 'is', null)
				.neq('email', 'api@levhaolam.com') // Exclude system/API emails

			if (error) throw error

			// Check if outgoing message is after incoming for each thread
			for (const outMsg of (data || []) as DialogOutRecord[]) {
				if (!outMsg.email || !outMsg.ticket_id || !outMsg.date) continue

				const outDate = new Date(outMsg.date)
				const threadsForTicket = ticketToThreads.get(outMsg.ticket_id) || []

				for (const threadId of threadsForTicket) {
					const inDate = incomingDates.get(threadId)
					if (inDate && outDate > inDate) {
						// This agent responded to this thread
						const existing = agentAnsweredThreads.get(outMsg.email) || new Set()
						existing.add(threadId)
						agentAnsweredThreads.set(outMsg.email, existing)
					}
				}
			}

			if (i + BATCH_SIZE < ticketIds.length) {
				await new Promise(resolve => setTimeout(resolve, 50))
			}
		}

		// =========================================================================
		// STEP 4: Fetch ai_human_comparison data (for AI stats)
		// =========================================================================

		// Map: email -> stats
		const agentAIStats = new Map<string, {
			aiReviewed: number
			changed: number
			criticalErrors: number
		}>()

		for (let i = 0; i < threadIds.length; i += BATCH_SIZE) {
			const batchIds = threadIds.slice(i, i + BATCH_SIZE)

			const { data, error } = await supabaseServer
				.from('ai_human_comparison')
				.select('email, change_classification, changed')
				.in('thread_id', batchIds)
				.not('email', 'is', null)
				.neq('email', 'api@levhaolam.com') // Exclude system/API emails

			if (error) throw error

			for (const record of (data || []) as RawComparisonRecord[]) {
				if (!record.email) continue

				const current = agentAIStats.get(record.email) || {
					aiReviewed: 0,
					changed: 0,
					criticalErrors: 0,
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

				agentAIStats.set(record.email, current)
			}

			if (i + BATCH_SIZE < threadIds.length) {
				await new Promise(resolve => setTimeout(resolve, 50))
			}
		}

		// =========================================================================
		// STEP 5: Combine stats and calculate percentages
		// =========================================================================

		// Get all unique emails from both sources
		const allEmails = new Set([
			...agentAnsweredThreads.keys(),
			...agentAIStats.keys(),
		])

		const result: AgentStatsRow[] = []

		for (const email of allEmails) {
			const answeredThreads = agentAnsweredThreads.get(email)
			const aiStats = agentAIStats.get(email)

			const answeredTickets = answeredThreads?.size || 0
			const aiReviewed = aiStats?.aiReviewed || 0
			const changed = aiStats?.changed || 0
			const criticalErrors = aiStats?.criticalErrors || 0

			// Only include agents with answered tickets or AI reviewed records
			if (answeredTickets === 0 && aiReviewed === 0) continue

			// Unnecessary changes = changed but AI was correct
			const unnecessaryChanges = Math.max(0, changed - criticalErrors)
			const unnecessaryChangesPercent = aiReviewed > 0
				? (unnecessaryChanges / aiReviewed) * 100
				: 0

			const aiEfficiency = 100 - unnecessaryChangesPercent

			result.push({
				email,
				answeredTickets,
				aiReviewed,
				changed,
				criticalErrors,
				unnecessaryChangesPercent: Math.round(unnecessaryChangesPercent * 10) / 10,
				aiEfficiency: Math.round(aiEfficiency * 10) / 10,
			})
		}

		// Sort by AI efficiency (descending)
		result.sort((a, b) => b.aiEfficiency - a.aiEfficiency)

		const duration = Date.now() - startTime
		console.log(`[AgentStats] Fetched ${result.length} agents from ${totalThreads} threads in ${duration}ms`)

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
