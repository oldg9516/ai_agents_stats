'use server'

/**
 * Action Analysis Quality Server Actions
 *
 * Fetches records with both AI action_analysis and agent verification
 * for measuring accuracy of AI action determination.
 */

import { supabaseServer } from '@/lib/supabase/server'
import { fetchActionAnalysisData } from '@/lib/supabase/queries-action-analysis'
import { REQUEST_TIMEOUT } from '@/lib/queries/query-config'
import type { ActionAnalysisFilters, ActionAnalysisRecord } from '@/lib/supabase/types'

function createTimeoutPromise(ms: number, operationName: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(
			() => reject(new Error(`${operationName} timed out after ${ms}ms`)),
			ms
		)
	)
}

/**
 * Extract error message from Supabase PostgrestError or standard Error
 */
function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	if (error && typeof error === 'object') {
		const e = error as { message?: string; details?: string; hint?: string; code?: string }
		return [e.message, e.details, e.hint, e.code].filter(Boolean).join(' | ')
	}
	return 'Unknown error'
}

/**
 * Fetch action analysis data with timeout protection
 */
export async function fetchActionAnalysisPageData(
	filters: ActionAnalysisFilters
): Promise<{ success: boolean; data?: ActionAnalysisRecord[]; error?: string }> {
	const startTime = Date.now()
	try {
		const dataPromise = fetchActionAnalysisData(supabaseServer, filters)

		const data = await Promise.race([
			dataPromise,
			createTimeoutPromise(REQUEST_TIMEOUT, 'Action analysis data fetch'),
		])

		const queryTime = Date.now() - startTime
		console.log(`✅ [ActionAnalysis] Fetched ${data.length} records in ${queryTime}ms`)

		return { success: true, data }
	} catch (error) {
		const queryTime = Date.now() - startTime
		const errorMessage = getErrorMessage(error)
		console.error(`❌ [ActionAnalysis] Error after ${queryTime}ms:`, errorMessage, error)
		return {
			success: false,
			error: errorMessage,
		}
	}
}
