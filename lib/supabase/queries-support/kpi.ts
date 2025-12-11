/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Support KPI Queries
 * Uses batched fetching to bypass Supabase's 1000 record limit
 */

import { getAllRequirementKeys } from '@/constants/requirement-types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupportFilters, SupportKPIs } from '../types'
import { calculateTrend } from './utils'

const BATCH_SIZE = 500
const MAX_CONCURRENT = 3

/**
 * Helper to fetch all records in batches for KPI calculation
 */
async function fetchAllForKPIs<T>(
	supabase: SupabaseClient,
	selectFields: string,
	dateFrom: Date,
	dateTo: Date,
	filters: SupportFilters
): Promise<T[]> {
	const { statuses, requestTypes, requirements, versions } = filters

	// First, get total count
	let countQuery = supabase
		.from('support_threads_data')
		.select('*', { count: 'exact', head: true })
		.gte('created_at', dateFrom.toISOString())
		.lt('created_at', dateTo.toISOString())

	if (statuses.length > 0) {
		countQuery = countQuery.in('status', statuses)
	}
	if (requestTypes.length > 0) {
		countQuery = countQuery.in('request_type', requestTypes)
	}
	if (versions.length > 0) {
		countQuery = countQuery.in('prompt_version', versions)
	}
	if (requirements.length > 0) {
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
				.from('support_threads_data')
				.select(selectFields)
				.gte('created_at', dateFrom.toISOString())
				.lt('created_at', dateTo.toISOString())
				.range(offset, offset + BATCH_SIZE - 1)

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
 * Fetch Support KPIs with trend data
 * Uses batched fetching to handle >1000 records
 */
export async function fetchSupportKPIs(
	supabase: SupabaseClient,
	filters: SupportFilters
): Promise<SupportKPIs> {
	const { dateRange } = filters

	// Calculate previous period
	const daysDiff = Math.ceil(
		(dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
	)
	const previousFrom = new Date(dateRange.from)
	previousFrom.setDate(previousFrom.getDate() - daysDiff)

	// OPTIMIZATION: Select only fields needed for KPI calculation (not SELECT *)
	const reqKeys = getAllRequirementKeys()
	const selectFields = [
		'ai_draft_reply',
		'requires_reply',
		'status',
		'prompt_version',
		...reqKeys,
	].join(',')

	// Type for KPI records
	type KPIRecord = {
		ai_draft_reply: string | null
		requires_reply: boolean
		status: string
		prompt_version: string | null
		[key: string]: any // For requirement fields
	}

	// Fetch current and previous period data in parallel
	const [currentRecords, previousRecords] = await Promise.all([
		fetchAllForKPIs<KPIRecord>(
			supabase,
			selectFields,
			dateRange.from,
			dateRange.to,
			filters
		),
		fetchAllForKPIs<KPIRecord>(
			supabase,
			selectFields,
			previousFrom,
			dateRange.from,
			filters
		),
	])

	// Get unique versions for agent response queries
	const currentVersions = Array.from(
		new Set(currentRecords.map(t => t.prompt_version).filter(Boolean))
	) as string[]

	const previousVersions = Array.from(
		new Set(previousRecords.map(t => t.prompt_version).filter(Boolean))
	) as string[]

	// Fetch agent response counts in parallel (all agents, not just qualified)
	const [currentAgentResponseCount, previousAgentResponseCount] = await Promise.all([
		currentVersions.length > 0
			? supabase
					.from('ai_human_comparison')
					.select('*', { count: 'exact', head: true })
					.in('prompt_version', currentVersions)
					.then(({ count }) => count || 0)
			: Promise.resolve(0),
		previousVersions.length > 0
			? supabase
					.from('ai_human_comparison')
					.select('*', { count: 'exact', head: true })
					.in('prompt_version', previousVersions)
					.then(({ count }) => count || 0)
			: Promise.resolve(0),
	])

	// Calculate KPIs for current period
	const currentTotal = currentRecords.length
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
	const previousTotal = previousRecords.length
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
