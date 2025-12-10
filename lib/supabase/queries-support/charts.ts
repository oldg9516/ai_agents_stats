/**
 * Support Chart Queries
 * Status distribution, resolution time, sankey, and correlation matrix
 */

import { getAllRequirementKeys } from '@/constants/requirement-types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	CorrelationCell,
	ResolutionTimeData,
	SankeyData,
	StatusDistribution,
	SupportFilters,
} from '../types'

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
