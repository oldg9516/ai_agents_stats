'use server'

/**
 * Eval Dashboard Server Actions
 *
 * Fetches eval results and computes readiness metrics per intent.
 */

import { supabaseServer } from '@/lib/supabase/server'
import {
	fetchEvalIntentTable,
	fetchEvalIntentDiagnostics,
} from '@/lib/supabase/queries-eval'
import { REQUEST_TIMEOUT } from '@/lib/queries/query-config'
import type { EvalFilters, EvalIntentRow, EvalIntentDiagnostics } from '@/lib/supabase/queries-eval'

function createTimeoutPromise(ms: number, operationName: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(
			() => reject(new Error(`${operationName} timed out after ${ms}ms`)),
			ms
		)
	)
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	if (error && typeof error === 'object') {
		const e = error as { message?: string; details?: string; hint?: string; code?: string }
		return [e.message, e.details, e.hint, e.code].filter(Boolean).join(' | ')
	}
	return 'Unknown error'
}

/**
 * Fetch eval intent table data with timeout protection
 */
export async function fetchEvalIntentTableData(
	filters: EvalFilters
): Promise<{ success: boolean; data?: EvalIntentRow[]; error?: string }> {
	const startTime = Date.now()
	try {
		const dataPromise = fetchEvalIntentTable(supabaseServer, filters)

		const data = await Promise.race([
			dataPromise,
			createTimeoutPromise(REQUEST_TIMEOUT, 'Eval intent table fetch'),
		])

		const queryTime = Date.now() - startTime
		console.log(`[EvalDashboard] Fetched ${data.length} intents in ${queryTime}ms`)

		return { success: true, data }
	} catch (error) {
		const queryTime = Date.now() - startTime
		const errorMessage = getErrorMessage(error)
		console.error(`[EvalDashboard] Error after ${queryTime}ms:`, errorMessage, error)
		return { success: false, error: errorMessage }
	}
}

/**
 * Fetch eval intent diagnostics with timeout protection
 */
export async function fetchEvalIntentDiagnosticsData(
	filters: EvalFilters,
	requestSubtype: string,
	requestSubSubtype: string | null
): Promise<{ success: boolean; data?: EvalIntentDiagnostics | null; error?: string }> {
	const startTime = Date.now()
	try {
		const dataPromise = fetchEvalIntentDiagnostics(
			supabaseServer,
			filters,
			requestSubtype,
			requestSubSubtype
		)

		const data = await Promise.race([
			dataPromise,
			createTimeoutPromise(REQUEST_TIMEOUT, 'Eval intent diagnostics fetch'),
		])

		const queryTime = Date.now() - startTime
		console.log(`[EvalDashboard] Fetched diagnostics for ${requestSubtype} in ${queryTime}ms`)

		return { success: true, data }
	} catch (error) {
		const queryTime = Date.now() - startTime
		const errorMessage = getErrorMessage(error)
		console.error(`[EvalDashboard] Diagnostics error after ${queryTime}ms:`, errorMessage, error)
		return { success: false, error: errorMessage }
	}
}
