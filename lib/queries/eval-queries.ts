'use client'

/**
 * Eval Dashboard React Query Hooks
 */

import { useQuery } from '@tanstack/react-query'
import { fetchEvalIntentTableData, fetchEvalIntentDiagnosticsData } from '@/lib/actions/eval-actions'
import { QUERY_CACHE_CONFIG } from '@/lib/queries/query-config'
import { evalKeys } from '@/lib/queries/query-keys'
import type { EvalFilters, EvalIntentRow, EvalIntentDiagnostics } from '@/lib/supabase/queries-eval'

/**
 * React Query hook for eval intent table (PRIMARY view)
 */
export function useEvalIntentTable(filters: EvalFilters) {
	const query = useQuery({
		queryKey: evalKeys.intentTable(filters),
		queryFn: async () => {
			const result = await fetchEvalIntentTableData(filters)
			if (!result.success) {
				throw new Error(result.error ?? 'Failed to fetch eval intent table data')
			}
			return result.data ?? []
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

/**
 * React Query hook for eval intent diagnostics (SECONDARY view)
 */
export function useEvalIntentDiagnostics(
	filters: EvalFilters,
	intentId: string | null
) {
	const parsed = intentId ? parseIntentId(intentId) : null

	const query = useQuery({
		queryKey: evalKeys.intentDiagnostics(filters, intentId ?? ''),
		queryFn: async () => {
			if (!parsed) return null
			const result = await fetchEvalIntentDiagnosticsData(
				filters,
				parsed.requestSubtype,
				parsed.requestSubSubtype
			)
			if (!result.success) {
				throw new Error(result.error ?? 'Failed to fetch eval intent diagnostics')
			}
			return result.data ?? null
		},
		enabled: !!intentId && !!parsed,
		...QUERY_CACHE_CONFIG,
	})

	return {
		data: query.data ?? null,
		isLoading: query.isLoading,
		error: query.error,
	}
}

/**
 * Parse intent ID from URL format: "request_subtype::request_sub_subtype"
 */
function parseIntentId(intentId: string): {
	requestSubtype: string
	requestSubSubtype: string | null
} | null {
	const parts = intentId.split('::')
	if (parts.length < 1 || !parts[0]) return null
	return {
		requestSubtype: parts[0],
		requestSubSubtype: parts[1] || null,
	}
}
