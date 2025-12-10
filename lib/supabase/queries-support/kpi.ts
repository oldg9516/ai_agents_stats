/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Support KPI Queries
 */

import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { getAllRequirementKeys } from '@/constants/requirement-types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupportFilters, SupportKPIs } from '../types'
import { calculateTrend } from './utils'

/**
 * Fetch Support KPIs with trend data
 * OPTIMIZED: Uses minimal field selection instead of SELECT *
 */
export async function fetchSupportKPIs(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<SupportKPIs> {
	const { dateRange, statuses, requestTypes, requirements, versions } = filters

	// Calculate previous period
	const daysDiff = Math.ceil(
		(dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
	)
	const previousFrom = new Date(dateRange.from)
	previousFrom.setDate(previousFrom.getDate() - daysDiff)

	// Build filters
	const buildQuery = (query: any, isPrevious: boolean) => {
		const from = isPrevious ? previousFrom : dateRange.from
		const to = isPrevious ? dateRange.from : dateRange.to

		query = query
			.gte('created_at', from.toISOString())
			.lt('created_at', to.toISOString())

		if (statuses.length > 0) {
			query = query.in('status', statuses)
		}
		if (requestTypes.length > 0) {
			query = query.in('request_type', requestTypes)
		}
		if (versions.length > 0) {
			query = query.in('prompt_version', versions)
		}
		if (requirements.length > 0) {
			// Filter threads that have at least one of the selected requirements
			requirements.forEach(req => {
				query = query.eq(req, true)
			})
		}

		return query
	}

	// OPTIMIZATION: Select only fields needed for KPI calculation (not SELECT *)
	// This dramatically reduces data transfer, especially avoiding large text fields
	const reqKeys = getAllRequirementKeys()
	const selectFields = [
		'ai_draft_reply',
		'requires_reply',
		'status',
		'prompt_version',
		...reqKeys,
	].join(',')

	// Fetch current period data
	let currentQuery = supabase
		.from('support_threads_data')
		.select(selectFields, { count: 'exact' })
	currentQuery = buildQuery(currentQuery, false)
	const {
		data: currentData,
		count: currentCount,
		error: currentError,
	} = await currentQuery

	if (currentError) throw currentError

	// Fetch previous period data
	let previousQuery = supabase
		.from('support_threads_data')
		.select(selectFields, { count: 'exact' })
	previousQuery = buildQuery(previousQuery, true)
	const {
		data: previousData,
		count: previousCount,
		error: previousError,
	} = await previousQuery

	if (previousError) throw previousError

	// Fetch agent response data for current period
	const currentVersions = Array.from(
		new Set(
			(currentData || []).map((t: any) => t.prompt_version).filter(Boolean)
		)
	) as string[]

	let currentAgentResponseCount = 0
	if (currentVersions.length > 0) {
		const { count: agentCount } = await supabase
			.from('ai_human_comparison')
			.select('*', { count: 'exact', head: true })
			.in('prompt_version', currentVersions)
			.in('email', QUALIFIED_AGENTS)
		currentAgentResponseCount = agentCount || 0
	}

	// Fetch agent response data for previous period
	const previousVersions = Array.from(
		new Set(
			(previousData || []).map((t: any) => t.prompt_version).filter(Boolean)
		)
	) as string[]

	let previousAgentResponseCount = 0
	if (previousVersions.length > 0) {
		const { count: agentCount } = await supabase
			.from('ai_human_comparison')
			.select('*', { count: 'exact', head: true })
			.in('prompt_version', previousVersions)
			.in('email', QUALIFIED_AGENTS)
		previousAgentResponseCount = agentCount || 0
	}

	// Type assertion for data - we know the structure from our select
	type KPIRecord = {
		ai_draft_reply: string | null
		requires_reply: boolean
		status: string
		[key: string]: any // For requirement fields
	}

	const currentRecords = (currentData || []) as unknown as KPIRecord[]
	const previousRecords = (previousData || []) as unknown as KPIRecord[]

	// Calculate KPIs for current period
	const currentTotal = currentCount || 0
	const currentRequiresReply = currentRecords.filter(
		t => t.requires_reply === true
	).length
	const currentResolved = currentRecords.filter(
		t => t.status === 'Reply is ready'
	).length

	const currentRequirementsCount = currentRecords.reduce((sum, thread) => {
		return sum + reqKeys.filter(key => thread[key] === true).length
	}, 0)

	// Calculate KPIs for previous period
	const previousTotal = previousCount || 0
	const previousRequiresReply = previousRecords.filter(
		t => t.requires_reply === true
	).length
	const previousResolved = previousRecords.filter(
		t => t.status === 'Reply is ready'
	).length

	const previousRequirementsCount = previousRecords.reduce((sum, thread) => {
		return sum + reqKeys.filter(key => thread[key] === true).length
	}, 0)

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
		currentTotal > 0 ? currentRequirementsCount / currentTotal : 0
	const previousAvgRequirements =
		previousTotal > 0 ? previousRequirementsCount / previousTotal : 0

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
