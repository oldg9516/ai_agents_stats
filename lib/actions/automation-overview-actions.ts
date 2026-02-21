'use server'

/**
 * Automation Overview Server Actions
 *
 * Fetches records from support_threads_data with action_analysis + is_outstanding
 * for automation status determination.
 */

import { supabaseServer } from '@/lib/supabase/server'
import { fetchAutomationOverviewData } from '@/lib/supabase/queries-automation-overview'
import { REQUEST_TIMEOUT } from '@/lib/queries/query-config'
import type { AutomationOverviewFilters, AutomationOverviewRecord } from '@/lib/supabase/types'

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
 * Fetch automation overview data with timeout protection
 */
export async function fetchAutomationOverviewPageData(
	filters: AutomationOverviewFilters
): Promise<{ success: boolean; data?: AutomationOverviewRecord[]; error?: string }> {
	const startTime = Date.now()
	try {
		const dataPromise = fetchAutomationOverviewData(supabaseServer, filters)

		const data = await Promise.race([
			dataPromise,
			createTimeoutPromise(REQUEST_TIMEOUT, 'Automation overview data fetch'),
		])

		const queryTime = Date.now() - startTime
		console.log(`[AutomationOverview] Fetched ${data.length} records in ${queryTime}ms`)

		return { success: true, data }
	} catch (error) {
		const queryTime = Date.now() - startTime
		const errorMessage = getErrorMessage(error)
		console.error(`[AutomationOverview] Error after ${queryTime}ms:`, errorMessage, error)
		return {
			success: false,
			error: errorMessage,
		}
	}
}
