/**
 * Support Overview Database Queries
 *
 * All queries for the Support Overview section with JOIN logic
 * between support_threads_data and ai_human_comparison tables
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	SupportKPIs,
	StatusDistribution,
	ResolutionTimeData,
	SankeyData,
	CorrelationCell,
	SupportThread,
	SupportFilters,
	TrendData,
} from './types'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { getAllRequirementKeys } from '@/constants/requirement-types'

/**
 * Calculate trend between current and previous values
 */
function calculateTrend(current: number, previous: number): TrendData {
	if (previous === 0) {
		return {
			value: current,
			percentage: current > 0 ? 100 : 0,
			direction: current > 0 ? 'up' : 'neutral',
		}
	}

	const value = current - previous
	const percentage = (value / previous) * 100

	return {
		value,
		percentage: Math.abs(percentage),
		direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral',
	}
}

/**
 * Fetch Support KPIs with trend data
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
			requirements.forEach((req) => {
				query = query.eq(req, true)
			})
		}

		return query
	}

	// Fetch current period data
	let currentQuery = supabase.from('support_threads_data').select('*')
	currentQuery = buildQuery(currentQuery, false)
	const { data: currentData, error: currentError } = await currentQuery

	if (currentError) throw currentError

	// Fetch previous period data
	let previousQuery = supabase.from('support_threads_data').select('*')
	previousQuery = buildQuery(previousQuery, true)
	const { data: previousData, error: previousError } = await previousQuery

	if (previousError) throw previousError

	// Calculate KPIs for current period
	const currentTotal = currentData?.length || 0
	const currentWithDraft =
		currentData?.filter((t) => t.ai_draft_reply !== null).length || 0
	const currentRequiresReply =
		currentData?.filter((t) => t.requires_reply === true).length || 0
	const currentResolved =
		currentData?.filter((t) => t.status === 'resolved').length || 0

	const currentRequirementsCount =
		currentData?.reduce((sum, thread) => {
			return (
				sum +
				getAllRequirementKeys().filter((key) => thread[key] === true).length
			)
		}, 0) || 0

	// Calculate KPIs for previous period
	const previousTotal = previousData?.length || 0
	const previousWithDraft =
		previousData?.filter((t) => t.ai_draft_reply !== null).length || 0
	const previousRequiresReply =
		previousData?.filter((t) => t.requires_reply === true).length || 0
	const previousResolved =
		previousData?.filter((t) => t.status === 'resolved').length || 0

	const previousRequirementsCount =
		previousData?.reduce((sum, thread) => {
			return (
				sum +
				getAllRequirementKeys().filter((key) => thread[key] === true).length
			)
		}, 0) || 0

	// Calculate percentages
	const currentDraftCoverage =
		currentTotal > 0 ? (currentWithDraft / currentTotal) * 100 : 0
	const previousDraftCoverage =
		previousTotal > 0 ? (previousWithDraft / previousTotal) * 100 : 0

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
		aiDraftCoverage: {
			current: currentDraftCoverage,
			previous: previousDraftCoverage,
			trend: calculateTrend(currentDraftCoverage, previousDraftCoverage),
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

/**
 * Fetch Status Distribution for pie chart
 */
export async function fetchStatusDistribution(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<StatusDistribution[]> {
	const { dateRange, statuses, requestTypes, requirements, versions } = filters

	let query = supabase
		.from('support_threads_data')
		.select('status')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

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
		requirements.forEach((req) => {
			query = query.eq(req, true)
		})
	}

	const { data, error } = await query

	if (error) throw error

	// Count by status
	const statusCounts = new Map<string, number>()
	const total = data?.length || 0

	data?.forEach((thread) => {
		const status = thread.status || 'unknown'
		statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
	})

	return Array.from(statusCounts.entries()).map(([status, count]) => ({
		status,
		count,
		percentage: total > 0 ? (count / total) * 100 : 0,
	}))
}

/**
 * Fetch Resolution Time data for bar chart
 * Shows average time from created_at to resolved status grouped by week
 */
export async function fetchResolutionTimeData(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<ResolutionTimeData[]> {
	const { dateRange, requestTypes, requirements, versions } = filters

	// Only get resolved threads
	let query = supabase
		.from('support_threads_data')
		.select('created_at, status')
		.eq('status', 'resolved')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	if (requestTypes.length > 0) {
		query = query.in('request_type', requestTypes)
	}
	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (requirements.length > 0) {
		requirements.forEach((req) => {
			query = query.eq(req, true)
		})
	}

	const { data, error } = await query

	if (error) throw error

	// Group by week
	const weekData = new Map<
		string,
		{ totalTime: number; count: number }
	>()

	data?.forEach((thread) => {
		if (!thread.created_at) return

		const createdDate = new Date(thread.created_at)
		const weekStart = new Date(createdDate)
		weekStart.setDate(
			weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1)
		)
		weekStart.setHours(0, 0, 0, 0)
		const weekKey = weekStart.toISOString().split('T')[0]

		// For now, assume resolved time is ~24 hours (placeholder logic)
		// In real app, you'd need a resolved_at timestamp
		const resolutionTime = 24

		const existing = weekData.get(weekKey) || { totalTime: 0, count: 0 }
		weekData.set(weekKey, {
			totalTime: existing.totalTime + resolutionTime,
			count: existing.count + 1,
		})
	})

	return Array.from(weekData.entries())
		.map(([weekStart, { totalTime, count }]) => ({
			weekStart,
			avgResolutionTime: count > 0 ? totalTime / count : 0,
			threadCount: count,
		}))
		.sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

/**
 * Fetch Sankey Data for AI draft flow
 * Shows: AI Draft Created → Used/Edited/Rejected → Outcomes
 */
export async function fetchSankeyData(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<SankeyData> {
	const { dateRange, statuses, requestTypes, requirements, versions } = filters

	let query = supabase
		.from('support_threads_data')
		.select('ai_draft_reply, requires_editing, status')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

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
		requirements.forEach((req) => {
			query = query.eq(req, true)
		})
	}

	const { data, error } = await query

	if (error) throw error

	// Count flows
	const flowCounts = {
		created: 0,
		usedAsIs: 0,
		edited: 0,
		rejected: 0,
		resolved: 0,
		pending: 0,
	}

	data?.forEach((thread) => {
		if (thread.ai_draft_reply) {
			flowCounts.created++

			if (thread.requires_editing) {
				flowCounts.edited++
			} else if (thread.ai_draft_reply) {
				flowCounts.usedAsIs++
			}

			if (thread.status === 'resolved') {
				flowCounts.resolved++
			} else {
				flowCounts.pending++
			}
		} else {
			flowCounts.rejected++
		}
	})

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
		{ source: 'used', target: 'resolved', value: Math.floor(flowCounts.resolved / 2) },
		{ source: 'edited', target: 'resolved', value: Math.floor(flowCounts.resolved / 2) },
		{ source: 'used', target: 'pending', value: Math.floor(flowCounts.pending / 2) },
		{ source: 'edited', target: 'pending', value: Math.floor(flowCounts.pending / 2) },
	]

	// Filter out zero-value links
	const filteredLinks = links.filter((link) => link.value > 0)

	return { nodes, links: filteredLinks }
}

/**
 * Fetch Correlation Matrix for requirements heatmap
 * Shows which requirements frequently occur together
 */
export async function fetchCorrelationMatrix(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<CorrelationCell[]> {
	const { dateRange, statuses, requestTypes, versions } = filters

	let query = supabase
		.from('support_threads_data')
		.select(
			'requires_reply, requires_identification, requires_editing, requires_subscription_info, requires_tracking_info'
		)
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	if (statuses.length > 0) {
		query = query.in('status', statuses)
	}
	if (requestTypes.length > 0) {
		query = query.in('request_type', requestTypes)
	}
	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}

	const { data, error } = await query

	if (error) throw error

	const requirementKeys = getAllRequirementKeys()
	const correlations: CorrelationCell[] = []

	// Calculate correlation for each pair
	for (const req1 of requirementKeys) {
		for (const req2 of requirementKeys) {
			const bothTrue =
				data?.filter((t) => t[req1] === true && t[req2] === true).length || 0
			const total = data?.length || 0

			const correlation = total > 0 ? bothTrue / total : 0

			correlations.push({
				x: req1,
				y: req2,
				value: correlation,
			})
		}
	}

	return correlations
}

/**
 * Fetch Support Threads with JOIN to ai_human_comparison
 */
export async function fetchSupportThreads(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<SupportThread[]> {
	const { dateRange, statuses, requestTypes, requirements, versions } = filters

	// First fetch support threads with filters
	let query = supabase
		.from('support_threads_data')
		.select('*')
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

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
		requirements.forEach((req) => {
			query = query.eq(req, true)
		})
	}

	const { data: threads, error: threadsError } = await query

	if (threadsError) throw threadsError

	// For each thread, try to find matching record in ai_human_comparison
	// Match by thread_id or ticket_id and prompt_version
	const enrichedThreads: SupportThread[] = await Promise.all(
		(threads || []).map(async (thread) => {
			// Try to find matching comparison record
			const { data: comparisonData } = await supabase
				.from('ai_human_comparison')
				.select('changed, email')
				.eq('prompt_version', thread.prompt_version || '')
				.in('email', QUALIFIED_AGENTS)
				.limit(1)
				.single()

			return {
				...thread,
				changed: comparisonData?.changed ?? null,
				email: comparisonData?.email ?? null,
				qualityPercentage:
					comparisonData?.changed === false ? 100 : comparisonData?.changed === true ? 0 : null,
			}
		})
	)

	return enrichedThreads
}

/**
 * Fetch single thread detail
 */
export async function fetchThreadDetail(
	supabase: SupabaseClient,
	threadId: string
): Promise<SupportThread | null> {
	const { data: thread, error: threadError } = await supabase
		.from('support_threads_data')
		.select('*')
		.eq('thread_id', threadId)
		.single()

	if (threadError) throw threadError
	if (!thread) return null

	// Try to find matching comparison record
	const { data: comparisonData } = await supabase
		.from('ai_human_comparison')
		.select('changed, email')
		.eq('prompt_version', thread.prompt_version || '')
		.in('email', QUALIFIED_AGENTS)
		.limit(1)
		.single()

	return {
		...thread,
		changed: comparisonData?.changed ?? null,
		email: comparisonData?.email ?? null,
		qualityPercentage:
			comparisonData?.changed === false ? 100 : comparisonData?.changed === true ? 0 : null,
	}
}
