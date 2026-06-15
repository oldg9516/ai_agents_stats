'use server'

/**
 * Automation Overview Server Actions
 *
 * Fetches records from support_threads_data with action_analysis + is_outstanding
 * for automation status determination.
 */

import { fetchAutomationOverviewData } from '@/lib/db/queries-automation-overview'
import { fetchAutoCloseStats } from '@/lib/db/queries-auto-close'
import { REQUEST_TIMEOUT } from '@/lib/queries/query-config'
import type {
	AutoCloseStats,
	AutomationOverviewFilters,
	AutomationOverviewRecord,
} from '@/lib/db/types'

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
		const dataPromise = fetchAutomationOverviewData(filters)

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

/**
 * Fetch auto-closed ticket stats (by tag) with timeout protection.
 * Only the date range is used — auto-closes have no request_subtype/version.
 */
export async function fetchAutoClosePageData(dateRange: {
	from: Date
	to: Date
}): Promise<{ success: boolean; data?: AutoCloseStats; error?: string }> {
	const startTime = Date.now()
	try {
		const data = await Promise.race([
			fetchAutoCloseStats(dateRange),
			createTimeoutPromise(REQUEST_TIMEOUT, 'Auto-close stats fetch'),
		])

		const queryTime = Date.now() - startTime
		console.log(
			`[AutoClose] Fetched ${data.tags.length} tags (${data.totalTickets} tickets) in ${queryTime}ms`
		)

		return { success: true, data }
	} catch (error) {
		const queryTime = Date.now() - startTime
		const errorMessage = getErrorMessage(error)
		console.error(`[AutoClose] Error after ${queryTime}ms:`, errorMessage, error)
		return {
			success: false,
			error: errorMessage,
		}
	}
}
