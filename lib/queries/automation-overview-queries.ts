'use client'

/**
 * Automation Overview React Query Hook
 *
 * Fetches records from support_threads_data and computes
 * auto-reply vs draft stats using the extensible rule system.
 */

import { useQuery } from '@tanstack/react-query'
import { fetchAutomationOverviewPageData } from '@/lib/actions/automation-overview-actions'
import { QUERY_CACHE_CONFIG } from '@/lib/queries/query-config'
import { automationOverviewKeys } from '@/lib/queries/query-keys'
import { resolveAutomationStatus, getRuleSourceForCategory, LAUNCHED_CATEGORIES } from '@/constants/automation-rules'
import type {
	AutomationOverviewFilters,
	AutomationOverviewRecord,
	AutomationOverviewStats,
	CategoryAutomationOverviewStats,
	SubSubAutomationOverviewStats,
} from '@/lib/db/types'

/**
 * Compute automation stats from raw records
 */
export function computeAutomationOverviewStats(
	records: AutomationOverviewRecord[]
): AutomationOverviewStats {
	if (records.length === 0) {
		return {
			totalRecords: 0,
			autoReplyCount: 0,
			draftCount: 0,
			autoReplyRate: 0,
			launchedTotalRecords: 0,
			launchedAutoReplyCount: 0,
			launchedDraftCount: 0,
			launchedAutoReplyRate: 0,
			uniqueTicketCount: 0,
			launchedUniqueTicketCount: 0,
			launchedAutoReplyUniqueTicketCount: 0,
			launchedDraftUniqueTicketCount: 0,
			categoryBreakdown: [],
		}
	}

	const launchedSet = new Set(LAUNCHED_CATEGORIES)

	let autoReplyCount = 0
	let draftCount = 0
	let launchedAutoReplyCount = 0
	let launchedDraftCount = 0
	const allTicketIds = new Set<number>()
	const launchedTicketIds = new Set<number>()
	const launchedAutoReplyTicketIds = new Set<number>()
	const launchedDraftTicketIds = new Set<number>()

	// Category accumulators
	const categoryMap = new Map<string, {
		totalRecords: number
		autoReplyCount: number
		draftCount: number
		goodAiCount: number
		evaluableCount: number
		subSubMap: Map<string, {
			totalRecords: number
			autoReplyCount: number
			draftCount: number
			goodAiCount: number
			evaluableCount: number
		}>
	}>()

	for (const record of records) {
		const { status } = resolveAutomationStatus(record)
		const isLaunched = record.request_subtype != null && launchedSet.has(record.request_subtype)

		if (status === 'auto_reply') {
			autoReplyCount++
			if (isLaunched) launchedAutoReplyCount++
		} else {
			draftCount++
			if (isLaunched) launchedDraftCount++
		}

		if (record.ticket_id != null) {
			allTicketIds.add(record.ticket_id)
			if (isLaunched) {
				launchedTicketIds.add(record.ticket_id)
				if (status === 'auto_reply') launchedAutoReplyTicketIds.add(record.ticket_id)
				else launchedDraftTicketIds.add(record.ticket_id)
			}
		}

		// Quality tracking: changed !== null means record has a match in ai_human_comparison
		// changed === false means human didn't change AI output (good quality)
		const isEvaluable = record.changed !== null
		const isGoodAi = record.changed === false

		const category = record.request_subtype ?? 'Unknown'
		let catEntry = categoryMap.get(category)
		if (!catEntry) {
			catEntry = {
				totalRecords: 0,
				autoReplyCount: 0,
				draftCount: 0,
				goodAiCount: 0,
				evaluableCount: 0,
				subSubMap: new Map(),
			}
			categoryMap.set(category, catEntry)
		}
		catEntry.totalRecords++
		if (status === 'auto_reply') catEntry.autoReplyCount++
		else catEntry.draftCount++
		if (isEvaluable) catEntry.evaluableCount++
		if (isGoodAi) catEntry.goodAiCount++

		// Sub-subcategory accumulation
		const subSub = record.request_sub_subtype ?? 'N/A'
		let subEntry = catEntry.subSubMap.get(subSub)
		if (!subEntry) {
			subEntry = { totalRecords: 0, autoReplyCount: 0, draftCount: 0, goodAiCount: 0, evaluableCount: 0 }
			catEntry.subSubMap.set(subSub, subEntry)
		}
		subEntry.totalRecords++
		if (status === 'auto_reply') subEntry.autoReplyCount++
		else subEntry.draftCount++
		if (isEvaluable) subEntry.evaluableCount++
		if (isGoodAi) subEntry.goodAiCount++
	}

	const totalRecords = records.length
	const autoReplyRate = totalRecords > 0 ? (autoReplyCount / totalRecords) * 100 : 0

	// Build category breakdown
	const categoryBreakdown: CategoryAutomationOverviewStats[] = Array.from(categoryMap.entries())
		.map(([category, data]) => {
			const subSubCategoryBreakdown: SubSubAutomationOverviewStats[] = Array.from(data.subSubMap.entries())
				.map(([subSub, subData]) => ({
					subSubCategory: subSub,
					totalRecords: subData.totalRecords,
					autoReplyCount: subData.autoReplyCount,
					draftCount: subData.draftCount,
					goodAiCount: subData.goodAiCount,
					evaluableCount: subData.evaluableCount,
				}))
				.sort((a, b) => b.totalRecords - a.totalRecords)

			return {
				category,
				totalRecords: data.totalRecords,
				autoReplyCount: data.autoReplyCount,
				draftCount: data.draftCount,
				autoReplyRate: data.totalRecords > 0 ? (data.autoReplyCount / data.totalRecords) * 100 : 0,
				ruleSource: getRuleSourceForCategory(category),
				goodAiCount: data.goodAiCount,
				evaluableCount: data.evaluableCount,
				subSubCategoryBreakdown,
			}
		})
		.sort((a, b) => b.totalRecords - a.totalRecords)

	const launchedTotalRecords = launchedAutoReplyCount + launchedDraftCount

	return {
		totalRecords,
		autoReplyCount,
		draftCount,
		autoReplyRate,
		launchedTotalRecords,
		launchedAutoReplyCount,
		launchedDraftCount,
		launchedAutoReplyRate: launchedTotalRecords > 0 ? (launchedAutoReplyCount / launchedTotalRecords) * 100 : 0,
		uniqueTicketCount: allTicketIds.size,
		launchedUniqueTicketCount: launchedTicketIds.size,
		launchedAutoReplyUniqueTicketCount: launchedAutoReplyTicketIds.size,
		launchedDraftUniqueTicketCount: launchedDraftTicketIds.size,
		categoryBreakdown,
	}
}

/**
 * React Query hook for automation overview data
 */
export function useAutomationOverviewData(filters: AutomationOverviewFilters) {
	const query = useQuery({
		queryKey: automationOverviewKeys.data(filters),
		queryFn: async () => {
			const result = await fetchAutomationOverviewPageData(filters)
			if (!result.success) {
				throw new Error(result.error ?? 'Failed to fetch automation overview data')
			}
			return computeAutomationOverviewStats(result.data ?? [])
		},
		...QUERY_CACHE_CONFIG,
	})

	return {
		data: query.data ?? null,
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
		isFetching: query.isFetching,
	}
}
