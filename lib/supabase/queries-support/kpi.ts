/**
 * Support KPI Queries
 * Uses SQL RPC function for server-side aggregation (no record limit issues)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupportFilters, SupportKPIs } from '../types'
import { buildFilterParams, calculateTrend } from './utils'

/**
 * Fetch Support KPIs with trend data
 * RPC returns current + previous period counts in a single query
 */
export async function fetchSupportKPIs(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<SupportKPIs> {
	const { dateRange } = filters

	// Calculate previous period (same duration before current period)
	const daysDiff = Math.ceil(
		(dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
	)
	const previousFrom = new Date(dateRange.from)
	previousFrom.setDate(previousFrom.getDate() - daysDiff)

	const { data, error } = await supabase.rpc('get_support_kpis', {
		...buildFilterParams(filters),
		p_prev_date_from: previousFrom.toISOString(),
	})

	if (error) throw error

	const row = data?.[0]
	if (!row) {
		// Return zeroed KPIs if no data
		const zeroTrend = { value: 0, percentage: 0, direction: 'neutral' as const }
		return {
			agentResponseRate: { current: 0, previous: 0, trend: zeroTrend },
			replyRequired: { current: 0, previous: 0, trend: zeroTrend },
			dataCollectionRate: { current: 0, previous: 0, trend: zeroTrend },
			avgRequirements: { current: 0, previous: 0, trend: zeroTrend },
		}
	}

	const currentTotal = Number(row.current_total)
	const previousTotal = Number(row.previous_total)
	const currentRequiresReply = Number(row.current_requires_reply)
	const previousRequiresReply = Number(row.previous_requires_reply)
	const currentResolved = Number(row.current_resolved)
	const previousResolved = Number(row.previous_resolved)
	const currentRequirementsSum = Number(row.current_requirements_sum)
	const previousRequirementsSum = Number(row.previous_requirements_sum)
	const currentAgentResponseCount = Number(row.current_agent_response_count)
	const previousAgentResponseCount = Number(row.previous_agent_response_count)

	// Calculate percentages
	const currentAgentResponseRate =
		currentTotal > 0 ? (currentAgentResponseCount / currentTotal) * 100 : 0
	const previousAgentResponseRate =
		previousTotal > 0 ? (previousAgentResponseCount / previousTotal) * 100 : 0

	const currentReplyRequiredPct =
		currentTotal > 0 ? (currentRequiresReply / currentTotal) * 100 : 0
	const previousReplyRequiredPct =
		previousTotal > 0 ? (previousRequiresReply / previousTotal) * 100 : 0

	const currentDataCollectionRate =
		currentTotal > 0 ? (currentResolved / currentTotal) * 100 : 0
	const previousDataCollectionRate =
		previousTotal > 0 ? (previousResolved / previousTotal) * 100 : 0

	const currentAvgRequirements =
		currentTotal > 0 ? currentRequirementsSum / currentTotal : 0
	const previousAvgRequirements =
		previousTotal > 0 ? previousRequirementsSum / previousTotal : 0

	return {
		agentResponseRate: {
			current: currentAgentResponseRate,
			previous: previousAgentResponseRate,
			trend: calculateTrend(
				currentAgentResponseRate,
				previousAgentResponseRate
			),
		},
		replyRequired: {
			current: currentReplyRequiredPct,
			previous: previousReplyRequiredPct,
			trend: calculateTrend(currentReplyRequiredPct, previousReplyRequiredPct),
		},
		dataCollectionRate: {
			current: currentDataCollectionRate,
			previous: previousDataCollectionRate,
			trend: calculateTrend(
				currentDataCollectionRate,
				previousDataCollectionRate
			),
		},
		avgRequirements: {
			current: currentAvgRequirements,
			previous: previousAvgRequirements,
			trend: calculateTrend(currentAvgRequirements, previousAvgRequirements),
		},
	}
}
