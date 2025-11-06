/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Support Overview Database Queries
 *
 * All queries for the Support Overview section with JOIN logic
 * between support_threads_data and ai_human_comparison tables
 */

import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { getAllRequirementKeys } from '@/constants/requirement-types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	CorrelationCell,
	RequestCategoryStats,
	ResolutionTimeData,
	SankeyData,
	StatusDistribution,
	SupportFilters,
	SupportKPIs,
	SupportThread,
	TrendData,
} from './types'

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
		.lt('created_at', dateRange.to.toISOString())

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
		requirements.forEach(req => {
			query = query.eq(req, true)
		})
	}

	const { data, error } = await query

	if (error) throw error

	// Count by status
	const statusCounts = new Map<string, number>()
	const total = data?.length || 0

	data?.forEach(thread => {
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

	// Only get threads with "Reply is ready" status (resolved)
	let query = supabase
		.from('support_threads_data')
		.select('created_at, status')
		.eq('status', 'Reply is ready')
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())

	if (requestTypes.length > 0) {
		query = query.in('request_type', requestTypes)
	}
	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (requirements.length > 0) {
		requirements.forEach(req => {
			query = query.eq(req, true)
		})
	}

	const { data, error } = await query

	if (error) throw error

	// Group by week
	const weekData = new Map<string, { totalTime: number; count: number }>()

	data?.forEach(thread => {
		if (!thread.created_at) return

		const createdDate = new Date(thread.created_at)
		const weekStart = new Date(createdDate)
		weekStart.setDate(
			weekStart.getDate() -
				weekStart.getDay() +
				(weekStart.getDay() === 0 ? -6 : 1)
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

	const result = Array.from(weekData.entries())
		.map(([weekStart, { totalTime, count }]) => ({
			weekStart,
			avgResolutionTime: count > 0 ? totalTime / count : 0,
			threadCount: count,
		}))
		.sort((a, b) => a.weekStart.localeCompare(b.weekStart))

	return result
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
		.lt('created_at', dateRange.to.toISOString())

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
		requirements.forEach(req => {
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

	data?.forEach(thread => {
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
		.lt('created_at', dateRange.to.toISOString())

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
				data?.filter(t => t[req1] === true && t[req2] === true).length || 0
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
	filters: SupportFilters,
	options?: { limit?: number; offset?: number }
): Promise<SupportThread[]> {
	const { dateRange, statuses, requestTypes, requirements, versions } = filters
	const { limit = 100, offset = 0 } = options || {}

	// First fetch support threads with filters + pagination
	let query = supabase
		.from('support_threads_data')
		.select('*')
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())
		.order('created_at', { ascending: false }) // Most recent first
		.range(offset, offset + limit - 1) // Pagination

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
		requirements.forEach(req => {
			query = query.eq(req, true)
		})
	}

	const { data: threads, error: threadsError } = await query

	if (threadsError) throw threadsError
	if (!threads || threads.length === 0) return []

	// Get thread IDs
	const threadIds = threads.map(t => t.thread_id)

	// Fetch all comparison data in a single query by thread_id
	const { data: comparisonData, error: comparisonError } = await supabase
		.from('ai_human_comparison')
		.select('thread_id, changed, email, human_reply')
		.in('thread_id', threadIds)

	if (comparisonError) {
		console.error('Error fetching comparison data:', comparisonError)
	}

	// Fetch all dialog data (direction) in a single query by thread_id
	const { data: dialogData, error: dialogError } = await supabase
		.from('support_dialogs')
		.select('thread_id, direction')
		.in('thread_id', threadIds)

	if (dialogError) {
		console.error('Error fetching dialog data:', dialogError)
	}

	// Create a map of thread_id -> comparison data
	const comparisonMap = new Map<string, { changed: boolean | null; email: string | null; human_reply: string | null }>()

	comparisonData?.forEach(comp => {
		if (comp.thread_id) {
			comparisonMap.set(comp.thread_id, {
				changed: comp.changed,
				email: comp.email,
				human_reply: comp.human_reply,
			})
		}
	})

	// Create a map of thread_id -> direction
	const dialogMap = new Map<string, string>()

	dialogData?.forEach(dialog => {
		if (dialog.thread_id && dialog.direction) {
			dialogMap.set(dialog.thread_id, dialog.direction)
		}
	})

	// Enrich threads with comparison and dialog data
	const enrichedThreads: SupportThread[] = threads.map(thread => {
		const comparison = comparisonMap.get(thread.thread_id)
		const direction = dialogMap.get(thread.thread_id)

		return {
			...thread,
			changed: comparison?.changed ?? null,
			email: comparison?.email ?? null,
			human_reply: comparison?.human_reply ?? null,
			direction: direction ?? null,
			qualityPercentage:
				comparison?.changed === false
					? 100
					: comparison?.changed === true
					? 0
					: null,
		}
	})

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

	// Try to find matching comparison record by thread_id
	const { data: comparisonData } = await supabase
		.from('ai_human_comparison')
		.select('changed, email, human_reply')
		.eq('thread_id', threadId)
		.limit(1)
		.single()

	// Try to find direction from support_dialogs
	const { data: dialogData } = await supabase
		.from('support_dialogs')
		.select('direction')
		.eq('thread_id', threadId)
		.limit(1)
		.single()

	return {
		...thread,
		changed: comparisonData?.changed ?? null,
		email: comparisonData?.email ?? null,
		human_reply: comparisonData?.human_reply ?? null,
		direction: dialogData?.direction ?? null,
		qualityPercentage:
			comparisonData?.changed === false
				? 100
				: comparisonData?.changed === true
				? 0
				: null,
	}
}

/**
 * Fetch Request Category Statistics
 * Shows breakdown of request_type and request_subtype with counts and percentages
 * Groups multiple subtypes (containing comma) as "multiply"
 */
export async function fetchRequestCategoryStats(
	supabase: SupabaseClient,
	dateRange: { from: Date; to: Date }
): Promise<RequestCategoryStats[]> {
	// Use SQL RPC function for accurate calculations with date filter
	const { data, error } = await supabase.rpc('get_request_category_stats', {
		date_from: dateRange.from.toISOString(),
		date_to: dateRange.to.toISOString(),
	})

	if (error) {
		console.error('❌ [Request Categories] RPC error:', error)
		throw error
	}

	console.log(`📊 [Request Categories] Fetched ${data?.length || 0} categories for date range ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`)

	return (data || []) as RequestCategoryStats[]
}
