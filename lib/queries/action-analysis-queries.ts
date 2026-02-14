'use client'

/**
 * Action Analysis Quality React Query Hook
 *
 * Fetches verified action analysis records and computes
 * aggregated stats for KPIs, charts, and category breakdown.
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
			totalVerified: 0,
			requiresActionCorrect: 0,
			requiresActionIncorrect: 0,
			requiresActionAccuracy: 0,
			actionTypeCorrect: 0,
			actionTypeIncorrect: 0,
			actionTypeAccuracy: 0,
			categoryBreakdown: [],
			actionTypeDistribution: [],
		}
	}

	// Single pass: compute global metrics + category accumulators + action type accumulators
	let requiresActionCorrect = 0
	let requiresActionIncorrect = 0
	let actionTypeCorrect = 0
	let actionTypeIncorrect = 0
	let totalVerified = 0

	// Category accumulators
	const categoryMap = new Map<string, {
		totalRecords: number
		totalVerified: number
		reqCorrect: number
		typeCorrect: number
		subSubMap: Map<string, {
			totalRecords: number
			totalVerified: number
			reqCorrect: number
			typeCorrect: number
		}>
	}>()

	// Action type accumulators: Map<actionType, { aiCount, correct, incorrect }>
	const actionTypeMap = new Map<string, {
		aiCount: number
		verifiedCorrect: number
		verifiedIncorrect: number
	}>()

	for (const record of records) {
		const { action_analysis, verification } = record
		if (!action_analysis) continue

		const category = record.request_subtype ?? 'Unknown'
		let catEntry = categoryMap.get(category)
		if (!catEntry) {
			catEntry = {
				totalRecords: 0, totalVerified: 0,
				reqCorrect: 0, typeCorrect: 0,
				subSubMap: new Map(),
			}
			categoryMap.set(category, catEntry)
		}
		catEntry.totalRecords++

		const subSub = record.request_sub_subtype ?? 'N/A'
		let subEntry = catEntry.subSubMap.get(subSub)
		if (!subEntry) {
			subEntry = { totalRecords: 0, totalVerified: 0, reqCorrect: 0, typeCorrect: 0 }
			catEntry.subSubMap.set(subSub, subEntry)
		}
		subEntry.totalRecords++

		// Action type distribution — count AI predictions from all records
		const aiTypes = action_analysis.action_type ?? []
		for (const actionType of aiTypes) {
			let typeEntry = actionTypeMap.get(actionType)
			if (!typeEntry) {
				typeEntry = { aiCount: 0, verifiedCorrect: 0, verifiedIncorrect: 0 }
				actionTypeMap.set(actionType, typeEntry)
			}
			typeEntry.aiCount++
		}

		// Accuracy metrics — only from verified records
		if (verification) {
			totalVerified++
			catEntry.totalVerified++
			subEntry.totalVerified++

			const reqCorrect = verification.requires_system_action_correct
			if (reqCorrect) {
				requiresActionCorrect++
				catEntry.reqCorrect++
				subEntry.reqCorrect++
			} else {
				requiresActionIncorrect++
			}

			const typeIsCorrect = verification.corrected_action_types == null
			if (typeIsCorrect) {
				actionTypeCorrect++
				catEntry.typeCorrect++
				subEntry.typeCorrect++
			} else {
				actionTypeIncorrect++
			}

			// Verified action type distribution
			const correctedTypes = verification.corrected_action_types
			for (const actionType of aiTypes) {
				const typeEntry = actionTypeMap.get(actionType)!
				if (correctedTypes == null) {
					typeEntry.verifiedCorrect++
				} else {
					if (correctedTypes.includes(actionType)) {
						typeEntry.verifiedCorrect++
					} else {
						typeEntry.verifiedIncorrect++
					}
				}
			}

			// Add corrected types that AI missed
			if (correctedTypes) {
				for (const correctedType of correctedTypes) {
					if (!aiTypes.includes(correctedType)) {
						let typeEntry = actionTypeMap.get(correctedType)
						if (!typeEntry) {
							typeEntry = { aiCount: 0, verifiedCorrect: 0, verifiedIncorrect: 0 }
							actionTypeMap.set(correctedType, typeEntry)
						}
						typeEntry.verifiedCorrect++
					}
				}
			}
		}
	}

	const totalRecords = records.length
	const requiresActionAccuracy = totalVerified > 0
		? (requiresActionCorrect / totalVerified) * 100
		: 0
	const actionTypeAccuracy = totalVerified > 0
		? (actionTypeCorrect / totalVerified) * 100
		: 0

	// Build category breakdown with automation score
	const maxVolume = Math.max(...Array.from(categoryMap.values()).map(c => c.totalRecords), 1)

	const categoryBreakdown: CategoryActionStats[] = Array.from(categoryMap.entries())
		.map(([category, data]) => {
			const reqAcc = data.totalVerified > 0 ? (data.reqCorrect / data.totalVerified) * 100 : 0
			const typeAcc = data.totalVerified > 0 ? (data.typeCorrect / data.totalVerified) * 100 : 0
			const avgAccuracy = data.totalVerified > 0 ? (reqAcc + typeAcc) / 2 : 0
			const normalizedVolume = data.totalRecords / maxVolume
			const automationScore = data.totalVerified > 0
				? avgAccuracy * 0.7 + normalizedVolume * 100 * 0.3
				: normalizedVolume * 100 // No accuracy yet — rank by volume only

			const subSubCategoryBreakdown: SubSubCategoryStats[] = Array.from(data.subSubMap.entries())
				.map(([subSub, subData]) => ({
					subSubCategory: subSub,
					totalRecords: subData.totalRecords,
					totalVerified: subData.totalVerified,
					requiresActionAccuracy: subData.totalVerified > 0 ? (subData.reqCorrect / subData.totalVerified) * 100 : 0,
					actionTypeAccuracy: subData.totalVerified > 0 ? (subData.typeCorrect / subData.totalVerified) * 100 : 0,
				}))
				.sort((a, b) => b.totalRecords - a.totalRecords)

			return {
				category,
				totalRecords: data.totalRecords,
				totalVerified: data.totalVerified,
				requiresActionAccuracy: reqAcc,
				actionTypeAccuracy: typeAcc,
				automationScore,
				subSubCategoryBreakdown,
			}
		})
		.sort((a, b) => b.totalRecords - a.totalRecords)

	// Build action type distribution
	const actionTypeDistribution: ActionTypeDistItem[] = Array.from(actionTypeMap.entries())
		.map(([actionType, data]) => ({
			actionType,
			aiCount: data.aiCount,
			verifiedCorrect: data.verifiedCorrect,
			verifiedIncorrect: data.verifiedIncorrect,
		}))
		.filter(item => item.actionType !== 'none')
		.sort((a, b) => b.aiCount - a.aiCount)

	return {
		totalRecords,
		totalVerified,
		requiresActionCorrect,
		requiresActionIncorrect,
		requiresActionAccuracy,
		actionTypeCorrect,
		actionTypeIncorrect,
		actionTypeAccuracy,
		categoryBreakdown,
		actionTypeDistribution,
	}
}

/**
 * React Query hook for action analysis data
 *
 * Fetches raw records via server action, then computes
 * aggregated stats client-side for display.
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
