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
import { resolveAutomationStatus, getRuleSourceForCategory } from '@/constants/automation-rules'
import type {
	AutomationOverviewFilters,
	AutomationOverviewRecord,
	AutomationOverviewStats,
	CategoryAutomationOverviewStats,
	SubSubAutomationOverviewStats,
} from '@/lib/supabase/types'

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
			categoryBreakdown: [],
		}
	}

	let autoReplyCount = 0
	let draftCount = 0

	// Category accumulators
	const categoryMap = new Map<string, {
		totalRecords: number
		autoReplyCount: number
		draftCount: number
		subSubMap: Map<string, {
			totalRecords: number
			autoReplyCount: number
			draftCount: number
		}>
	}>()

	for (const record of records) {
		const { status } = resolveAutomationStatus(record)

		if (status === 'auto_reply') {
			autoReplyCount++
		} else {
			draftCount++
		}

		// Category accumulation
		const category = record.request_subtype ?? 'Unknown'
		let catEntry = categoryMap.get(category)
		if (!catEntry) {
			catEntry = {
				totalRecords: 0,
				autoReplyCount: 0,
				draftCount: 0,
				subSubMap: new Map(),
			}
			categoryMap.set(category, catEntry)
		}
		catEntry.totalRecords++
		if (status === 'auto_reply') catEntry.autoReplyCount++
		else catEntry.draftCount++

		// Sub-subcategory accumulation
		const subSub = record.request_sub_subtype ?? 'N/A'
		let subEntry = catEntry.subSubMap.get(subSub)
		if (!subEntry) {
			subEntry = { totalRecords: 0, autoReplyCount: 0, draftCount: 0 }
			catEntry.subSubMap.set(subSub, subEntry)
		}
		subEntry.totalRecords++
		if (status === 'auto_reply') subEntry.autoReplyCount++
		else subEntry.draftCount++
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
				}))
				.sort((a, b) => b.totalRecords - a.totalRecords)

			return {
				category,
				totalRecords: data.totalRecords,
				autoReplyCount: data.autoReplyCount,
				draftCount: data.draftCount,
				autoReplyRate: data.totalRecords > 0 ? (data.autoReplyCount / data.totalRecords) * 100 : 0,
				ruleSource: getRuleSourceForCategory(category),
				subSubCategoryBreakdown,
			}
		})
		.sort((a, b) => b.totalRecords - a.totalRecords)

	return {
		totalRecords,
		autoReplyCount,
		draftCount,
		autoReplyRate,
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
