'use client'

/**
 * Action Analysis Quality React Query Hook
 *
 * Fetches action analysis records from support_threads_data
 * and computes aggregated stats for KPIs, charts, and category breakdown.
 */

import { useQuery } from '@tanstack/react-query'
import { fetchActionAnalysisPageData } from '@/lib/actions/action-analysis-actions'
import { QUERY_CACHE_CONFIG } from '@/lib/queries/query-config'
import { actionAnalysisKeys } from '@/lib/queries/query-keys'
import type {
	ActionAnalysisFilters,
	ActionAnalysisRecord,
	ActionAnalysisStats,
	CategoryActionStats,
	SubSubCategoryStats,
	ActionTypeDistItem,
} from '@/lib/supabase/types'

/**
 * Compute aggregated stats from raw records (js-combine-iterations)
 * Pure function — no side effects, deterministic output
 */
export function computeActionAnalysisStats(
	records: ActionAnalysisRecord[]
): ActionAnalysisStats {
	if (records.length === 0) {
		return {
			totalRecords: 0,
			requiresActionTrue: 0,
			requiresActionFalse: 0,
			totalVerified: 0,
			requiresActionAccuracy: 0,
			actionTypeAccuracy: 0,
			categoryBreakdown: [],
			actionTypeDistribution: [],
		}
	}

	let requiresActionTrue = 0
	let requiresActionFalse = 0
	let totalVerified = 0
	let reqAccCorrect = 0
	let typeAccCorrect = 0

	// Category accumulators
	const categoryMap = new Map<string, {
		totalRecords: number
		reqTrue: number
		reqFalse: number
		totalVerified: number
		reqAccCorrect: number
		typeAccCorrect: number
		subSubMap: Map<string, {
			totalRecords: number
			reqTrue: number
			reqFalse: number
		}>
	}>()

	// Action type distribution
	const actionTypeMap = new Map<string, number>()

	for (const record of records) {
		const { action_analysis, verification } = record

		// requires_system_action distribution
		if (action_analysis.requires_system_action) {
			requiresActionTrue++
		} else {
			requiresActionFalse++
		}

		// Category accumulation
		const category = record.request_subtype ?? 'Unknown'
		let catEntry = categoryMap.get(category)
		if (!catEntry) {
			catEntry = {
				totalRecords: 0, reqTrue: 0, reqFalse: 0,
				totalVerified: 0, reqAccCorrect: 0, typeAccCorrect: 0,
				subSubMap: new Map(),
			}
			categoryMap.set(category, catEntry)
		}
		catEntry.totalRecords++
		if (action_analysis.requires_system_action) catEntry.reqTrue++
		else catEntry.reqFalse++

		// Sub-subcategory accumulation
		const subSub = record.request_sub_subtype ?? 'N/A'
		let subEntry = catEntry.subSubMap.get(subSub)
		if (!subEntry) {
			subEntry = { totalRecords: 0, reqTrue: 0, reqFalse: 0 }
			catEntry.subSubMap.set(subSub, subEntry)
		}
		subEntry.totalRecords++
		if (action_analysis.requires_system_action) subEntry.reqTrue++
		else subEntry.reqFalse++

		// Action type distribution (from all records)
		const aiTypes = action_analysis.action_type ?? []
		for (const actionType of aiTypes) {
			actionTypeMap.set(actionType, (actionTypeMap.get(actionType) ?? 0) + 1)
		}

		// Accuracy — only from verified records
		if (verification) {
			totalVerified++
			catEntry.totalVerified++

			if (verification.requires_system_action_correct) reqAccCorrect++
			if (verification.corrected_action_types == null) typeAccCorrect++

			if (verification.requires_system_action_correct) catEntry.reqAccCorrect++
			if (verification.corrected_action_types == null) catEntry.typeAccCorrect++
		}
	}

	const totalRecords = records.length
	const requiresActionAccuracy = totalVerified > 0 ? (reqAccCorrect / totalVerified) * 100 : 0
	const actionTypeAccuracy = totalVerified > 0 ? (typeAccCorrect / totalVerified) * 100 : 0

	// Build category breakdown
	const categoryBreakdown: CategoryActionStats[] = Array.from(categoryMap.entries())
		.map(([category, data]) => {
			const subSubCategoryBreakdown: SubSubCategoryStats[] = Array.from(data.subSubMap.entries())
				.map(([subSub, subData]) => ({
					subSubCategory: subSub,
					totalRecords: subData.totalRecords,
					requiresActionTrue: subData.reqTrue,
					requiresActionFalse: subData.reqFalse,
				}))
				.sort((a, b) => b.totalRecords - a.totalRecords)

			return {
				category,
				totalRecords: data.totalRecords,
				requiresActionTrue: data.reqTrue,
				requiresActionFalse: data.reqFalse,
				totalVerified: data.totalVerified,
				requiresActionAccuracy: data.totalVerified > 0 ? (data.reqAccCorrect / data.totalVerified) * 100 : 0,
				actionTypeAccuracy: data.totalVerified > 0 ? (data.typeAccCorrect / data.totalVerified) * 100 : 0,
				subSubCategoryBreakdown,
			}
		})
		.sort((a, b) => b.totalRecords - a.totalRecords)

	// Build action type distribution
	const actionTypeDistribution: ActionTypeDistItem[] = Array.from(actionTypeMap.entries())
		.map(([actionType, count]) => ({ actionType, count }))
		.filter(item => item.actionType !== 'none')
		.sort((a, b) => b.count - a.count)

	return {
		totalRecords,
		requiresActionTrue,
		requiresActionFalse,
		totalVerified,
		requiresActionAccuracy,
		actionTypeAccuracy,
		categoryBreakdown,
		actionTypeDistribution,
	}
}

/**
 * React Query hook for action analysis data
 */
export function useActionAnalysisData(filters: ActionAnalysisFilters) {
	const query = useQuery({
		queryKey: actionAnalysisKeys.data(filters),
		queryFn: async () => {
			const result = await fetchActionAnalysisPageData(filters)
			if (!result.success) {
				throw new Error(result.error ?? 'Failed to fetch action analysis data')
			}
			return computeActionAnalysisStats(result.data ?? [])
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
