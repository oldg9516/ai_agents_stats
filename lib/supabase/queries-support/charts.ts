/**
 * Support Chart Queries
 * Status distribution, resolution time, sankey, and correlation matrix
 *
 * NOTE: These queries use batched fetching to bypass Supabase's 1000 record limit
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

const BATCH_SIZE = 500
const MAX_CONCURRENT = 3

/**
 * Helper to fetch all records in batches (bypasses Supabase 1000 limit)
 */
async function fetchAllInBatches<T>(
	supabase: SupabaseClient,
	tableName: string,
	selectFields: string,
	filters: SupportFilters
): Promise<T[]> {
	const { dateRange, statuses, requestTypes, categories, requirements, versions } = filters

	// First, get total count (using 'id' instead of '*' for better performance)
	let countQuery = supabase
		.from(tableName)
		.select('id', { count: 'exact', head: true })
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())

	if (statuses && statuses.length > 0) {
		countQuery = countQuery.in('status', statuses)
	}
	if (requestTypes && requestTypes.length > 0) {
		countQuery = countQuery.in('request_type', requestTypes)
	}
	if (categories && categories.length > 0) {
		countQuery = countQuery.in('request_subtype', categories)
	}
	if (versions && versions.length > 0) {
		countQuery = countQuery.in('prompt_version', versions)
	}
	if (requirements && requirements.length > 0) {
		requirements.forEach(req => {
			countQuery = countQuery.eq(req, true)
		})
	}

	const { count, error: countError } = await countQuery
	if (countError) throw countError

	const totalRecords = count || 0
	if (totalRecords === 0) return []

	// Fetch in batches with limited concurrency
	const numBatches = Math.ceil(totalRecords / BATCH_SIZE)
	const results: T[] = []

	for (let batchStart = 0; batchStart < numBatches; batchStart += MAX_CONCURRENT) {
		const batchPromises = []

		for (let i = batchStart; i < Math.min(batchStart + MAX_CONCURRENT, numBatches); i++) {
			const offset = i * BATCH_SIZE

			let query = supabase
				.from(tableName)
				.select(selectFields)
				.gte('created_at', dateRange.from.toISOString())
				.lt('created_at', dateRange.to.toISOString())
				.range(offset, offset + BATCH_SIZE - 1)

			if (statuses && statuses.length > 0) {
				query = query.in('status', statuses)
			}
			if (requestTypes && requestTypes.length > 0) {
				query = query.in('request_type', requestTypes)
			}
			if (categories && categories.length > 0) {
				query = query.in('request_subtype', categories)
			}
			if (versions && versions.length > 0) {
				query = query.in('prompt_version', versions)
			}
			if (requirements && requirements.length > 0) {
				requirements.forEach(req => {
					query = query.eq(req, true)
				})
			}

			const promise = query.then(({ data, error }) => {
				if (error) throw error
				return (data || []) as T[]
			})

			batchPromises.push(promise)
		}

		const batchResults = await Promise.all(batchPromises)
		results.push(...batchResults.flat())

		// Small delay between batch groups
		if (batchStart + MAX_CONCURRENT < numBatches) {
			await new Promise(resolve => setTimeout(resolve, 50))
		}
	}

	return results
}

/**
 * Fetch Status Distribution for pie chart
 * Uses batched fetching to handle >1000 records
 */
export async function fetchStatusDistribution(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<StatusDistribution[]> {
	const data = await fetchAllInBatches<{ status: string }>(
		supabase,
		'support_threads_data',
		'status',
		filters
	)

	// Count by status
	const statusCounts = new Map<string, number>()
	const total = data.length

	data.forEach(thread => {
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
 * Helper to fetch all records in batches from ai_human_comparison
 * Uses the same batching approach but for ai_human_comparison table
 */
async function fetchAllComparisonInBatches<T>(
	supabase: SupabaseClient,
	selectFields: string,
	dateFrom: Date,
	dateTo: Date
): Promise<T[]> {
	// First, get total count (using 'id' instead of '*' for better performance)
	const { count, error: countError } = await supabase
		.from('ai_human_comparison')
		.select('id', { count: 'exact', head: true })
		.gte('created_at', dateFrom.toISOString())
		.lt('created_at', dateTo.toISOString())
		.not('human_reply_date', 'is', null)

	if (countError) throw countError

	const totalRecords = count || 0
	if (totalRecords === 0) return []

	// Fetch in batches with limited concurrency
	const numBatches = Math.ceil(totalRecords / BATCH_SIZE)
	const results: T[] = []

	for (let batchStart = 0; batchStart < numBatches; batchStart += MAX_CONCURRENT) {
		const batchPromises = []

		for (let i = batchStart; i < Math.min(batchStart + MAX_CONCURRENT, numBatches); i++) {
			const offset = i * BATCH_SIZE

			const promise = supabase
				.from('ai_human_comparison')
				.select(selectFields)
				.gte('created_at', dateFrom.toISOString())
				.lt('created_at', dateTo.toISOString())
				.not('human_reply_date', 'is', null)
				.range(offset, offset + BATCH_SIZE - 1)
				.then(({ data, error }) => {
					if (error) throw error
					return (data || []) as T[]
				})

			batchPromises.push(promise)
		}

		const batchResults = await Promise.all(batchPromises)
		results.push(...batchResults.flat())

		// Small delay between batch groups
		if (batchStart + MAX_CONCURRENT < numBatches) {
			await new Promise(resolve => setTimeout(resolve, 50))
		}
	}

	return results
}

/**
 * Fetch Resolution Time data for bar chart
 * Shows average agent response time (human_reply_date - created_at) grouped by week
 * Data comes from ai_human_comparison table where actual response times are recorded
 * Uses batched fetching to handle >1000 records
 */
export async function fetchResolutionTimeData(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<ResolutionTimeData[]> {
	const { dateRange } = filters

	// Fetch data from ai_human_comparison with actual response timestamps
	const data = await fetchAllComparisonInBatches<{
		created_at: string
		human_reply_date: string
	}>(
		supabase,
		'created_at, human_reply_date',
		dateRange.from,
		dateRange.to
	)

	// Group by week and calculate average response time
	const weekData = new Map<string, { totalTime: number; count: number }>()

	data.forEach(record => {
		if (!record.created_at || !record.human_reply_date) return

		const createdDate = new Date(record.created_at)
		const replyDate = new Date(record.human_reply_date)

		// Calculate response time in hours
		const responseTimeHours = (replyDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60)

		// Skip negative or unrealistic values (data quality issue)
		if (responseTimeHours < 0 || responseTimeHours > 720) return // Max 30 days

		// Get week start (Monday)
		const weekStart = new Date(createdDate)
		weekStart.setDate(
			weekStart.getDate() -
				weekStart.getDay() +
				(weekStart.getDay() === 0 ? -6 : 1)
		)
		weekStart.setHours(0, 0, 0, 0)
		const weekKey = weekStart.toISOString().split('T')[0]

		const existing = weekData.get(weekKey) || { totalTime: 0, count: 0 }
		weekData.set(weekKey, {
			totalTime: existing.totalTime + responseTimeHours,
			count: existing.count + 1,
		})
	})

	const result = Array.from(weekData.entries())
		.map(([weekStart, { totalTime, count }]) => ({
			weekStart,
			avgResolutionTime: count > 0 ? Math.round((totalTime / count) * 10) / 10 : 0, // Round to 1 decimal
			threadCount: count,
		}))
		.sort((a, b) => a.weekStart.localeCompare(b.weekStart))

	return result
}

/**
 * Fetch Sankey Data for AI draft flow
 * Shows: AI Draft Created → Used/Edited/Rejected → Outcomes
 * Uses batched fetching to handle >1000 records
 */
export async function fetchSankeyData(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<SankeyData> {
	const data = await fetchAllInBatches<{
		ai_draft_reply: string | null
		requires_editing: boolean
		status: string
	}>(
		supabase,
		'support_threads_data',
		'ai_draft_reply, requires_editing, status',
		filters
	)

	// Count flows
	const flowCounts = {
		created: 0,
		usedAsIs: 0,
		edited: 0,
		rejected: 0,
		resolved: 0,
		pending: 0,
	}

	data.forEach(thread => {
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
 * Uses batched fetching to handle >1000 records
 */
export async function fetchCorrelationMatrix(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<CorrelationCell[]> {
	// For correlation matrix, we don't apply requirements filter (we want all combinations)
	const filtersWithoutRequirements: SupportFilters = {
		...filters,
		requirements: [],
	}

	const data = await fetchAllInBatches<{
		requires_reply: boolean
		requires_identification: boolean
		requires_editing: boolean
		requires_subscription_info: boolean
		requires_tracking_info: boolean
	}>(
		supabase,
		'support_threads_data',
		'requires_reply, requires_identification, requires_editing, requires_subscription_info, requires_tracking_info',
		filtersWithoutRequirements
	)

	const requirementKeys = getAllRequirementKeys()
	const correlations: CorrelationCell[] = []

	// Calculate correlation for each pair
	for (const req1 of requirementKeys) {
		for (const req2 of requirementKeys) {
			const bothTrue = data.filter(
				t => t[req1 as keyof typeof t] === true && t[req2 as keyof typeof t] === true
			).length
			const total = data.length

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
