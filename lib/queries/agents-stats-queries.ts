'use client'

/**
 * TanStack Query hooks for Agent Stats data
 *
 * Provides cached data fetching for:
 * - Agent statistics table
 * - Agent change tickets modal
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
	fetchAgentStats,
	fetchAgentChangeTickets,
} from '@/lib/actions/agents-stats-actions'
import { QUERY_CACHE_CONFIG, REQUEST_TIMEOUT } from './query-config'
import type {
	AgentStatsFilters,
	AgentStatsRow,
	AgentChangeTicket,
	AgentChangeType,
} from '@/lib/db/types'
import { DEFAULT_AGENT_EMAILS } from '@/lib/store/slices/agents-stats-slice'

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calculate totals row for all agents (pure function, not a server action)
 */
function calculateAgentStatsTotals(rows: AgentStatsRow[]): AgentStatsRow {
	const totals = rows.reduce(
		(acc, row) => ({
			answeredTickets: acc.answeredTickets + row.answeredTickets,
			aiReviewed: acc.aiReviewed + row.aiReviewed,
			changed: acc.changed + row.changed,
			criticalErrors: acc.criticalErrors + row.criticalErrors,
		}),
		{ answeredTickets: 0, aiReviewed: 0, changed: 0, criticalErrors: 0 }
	)

	const unnecessaryChanges = Math.max(0, totals.changed - totals.criticalErrors)
	const unnecessaryChangesPercent = totals.aiReviewed > 0
		? (unnecessaryChanges / totals.aiReviewed) * 100
		: 0
	const aiEfficiency = 100 - unnecessaryChangesPercent

	// Calculate weighted average response times across all agents
	const rowsWithResponseTime = rows.filter(r => r.avgResponseTime > 0)
	const totalAvgResponseTime = rowsWithResponseTime.length > 0
		? Math.round(
				(rowsWithResponseTime.reduce((sum, r) => sum + r.avgResponseTime, 0) /
					rowsWithResponseTime.length) *
					10
			) / 10
		: 0
	const totalMedianResponseTime = rowsWithResponseTime.length > 0
		? Math.round(
				(rowsWithResponseTime.reduce((sum, r) => sum + r.medianResponseTime, 0) /
					rowsWithResponseTime.length) *
					10
			) / 10
		: 0
	const totalP90ResponseTime = rowsWithResponseTime.length > 0
		? Math.round(
				(rowsWithResponseTime.reduce((sum, r) => sum + r.p90ResponseTime, 0) /
					rowsWithResponseTime.length) *
					10
			) / 10
		: 0

	return {
		email: 'TOTAL',
		answeredTickets: totals.answeredTickets,
		aiReviewed: totals.aiReviewed,
		changed: totals.changed,
		criticalErrors: totals.criticalErrors,
		unnecessaryChangesPercent: Math.round(unnecessaryChangesPercent * 10) / 10,
		aiEfficiency: Math.round(aiEfficiency * 10) / 10,
		avgResponseTime: totalAvgResponseTime,
		medianResponseTime: totalMedianResponseTime,
		p90ResponseTime: totalP90ResponseTime,
	}
}

// =============================================================================
// QUERY KEYS
// =============================================================================

/**
 * Generate query key for agent stats
 */
function getAgentStatsQueryKey(filters: AgentStatsFilters) {
	return [
		'agentStats',
		{
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
			versions: filters.versions.sort(),
			categories: filters.categories.sort(),
		},
	] as const
}

/**
 * Generate query key for agent change tickets
 */
function getAgentChangeTicketsQueryKey(
	agentEmail: string,
	filters: AgentStatsFilters,
	changeType: AgentChangeType,
	page: number,
	pageSize: number
) {
	return [
		'agentChangeTickets',
		agentEmail,
		changeType,
		page,
		pageSize,
		{
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
			versions: filters.versions.sort(),
			categories: filters.categories.sort(),
		},
	] as const
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for fetching agent statistics
 *
 * Returns:
 * - data: Array of agent stats + totals row
 * - isLoading: Initial loading state
 * - isFetching: Background fetching state
 * - error: Error if any
 */
export function useAgentStats(filters: AgentStatsFilters): {
	data: AgentStatsRow[]
	allEmails: string[]
	totals: AgentStatsRow | null
	isLoading: boolean
	isFetching: boolean
	error: Error | null
	refetch: () => void
} {
	const query = useQuery({
		queryKey: getAgentStatsQueryKey(filters),
		queryFn: async () => {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

			try {
				const result = await fetchAgentStats(filters)
				clearTimeout(timeoutId)

				if (!result.success) {
					throw new Error(result.error || 'Failed to fetch agent stats')
				}

				return result.data
			} catch (error) {
				clearTimeout(timeoutId)
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error(
						'Request timed out. Please try with more specific filters.'
					)
				}
				throw error
			}
		},
		...QUERY_CACHE_CONFIG,
	})

	// All available agent emails (for filter dropdown)
	const allEmails = (query.data || []).map(row => row.email).sort()

	// Filter by selected agents (client-side, instant)
	// Default to DEFAULT_AGENT_EMAILS if agents is undefined (old localStorage)
	const selectedAgents = filters.agents ?? DEFAULT_AGENT_EMAILS
	const filteredData = query.data
		? selectedAgents.length > 0
			? query.data.filter(row => selectedAgents.includes(row.email))
			: query.data
		: []

	// Calculate totals from filtered data
	const totals = filteredData.length > 0
		? calculateAgentStatsTotals(filteredData)
		: null

	return {
		data: filteredData,
		allEmails,
		totals,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		error: query.error,
		refetch: query.refetch,
	}
}

/**
 * Hook for fetching agent change tickets (for modal)
 *
 * @param agentEmail - Agent's email (null to disable query)
 * @param filters - Filters
 * @param changeType - Type of changes ('all', 'critical', 'unnecessary')
 * @param page - Page number (0-indexed)
 * @param pageSize - Records per page
 */
export function useAgentChangeTickets(
	agentEmail: string | null,
	filters: AgentStatsFilters,
	changeType: AgentChangeType,
	page: number = 0,
	pageSize: number = 20
): {
	data: AgentChangeTicket[]
	total: number
	totalPages: number
	isLoading: boolean
	isFetching: boolean
	error: Error | null
} {
	const query = useQuery({
		queryKey: getAgentChangeTicketsQueryKey(
			agentEmail || '',
			filters,
			changeType,
			page,
			pageSize
		),
		queryFn: async () => {
			if (!agentEmail) {
				return { data: [], total: 0 }
			}

			const result = await fetchAgentChangeTickets(
				agentEmail,
				filters,
				changeType,
				page,
				pageSize
			)

			if (!result.success) {
				throw new Error(result.error || 'Failed to fetch tickets')
			}

			return result.data
		},
		enabled: !!agentEmail, // Only fetch when agentEmail is provided
		...QUERY_CACHE_CONFIG,
	})

	const total = query.data?.total || 0
	const totalPages = Math.ceil(total / pageSize)

	return {
		data: query.data?.data || [],
		total,
		totalPages,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		error: query.error,
	}
}

/**
 * Hook to prefetch agent change tickets
 * Useful for preloading data before user opens modal
 */
export function usePrefetchAgentChangeTickets() {
	const queryClient = useQueryClient()

	return (
		agentEmail: string,
		filters: AgentStatsFilters,
		changeType: AgentChangeType = 'all'
	) => {
		queryClient.prefetchQuery({
			queryKey: getAgentChangeTicketsQueryKey(
				agentEmail,
				filters,
				changeType,
				0,
				20
			),
			queryFn: async () => {
				const result = await fetchAgentChangeTickets(
					agentEmail,
					filters,
					changeType,
					0,
					20
				)

				if (!result.success) {
					throw new Error(result.error)
				}

				return result.data
			},
		})
	}
}
