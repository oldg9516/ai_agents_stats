'use server'

/**
 * Backlog Reports Server Actions
 *
 * Server-side functions for fetching and managing backlog reports
 */

import {
	getBacklogReports,
	getBacklogReportById,
	triggerReportGeneration,
	getLatestReportTimestamp,
} from '@/lib/supabase/queries/backlog-reports'
import type { BacklogReport, BacklogReportsFilters } from '@/lib/supabase/types'

/**
 * Fetch paginated list of backlog reports
 */
export async function fetchBacklogReports(
	filters: BacklogReportsFilters,
	page: number = 0
): Promise<{
	success: boolean
	data?: { data: BacklogReport[]; totalCount: number }
	error?: string
}> {
	try {
		console.log('🔍 [BacklogReports Action] Fetching with filters:', {
			dateFrom: filters.dateRange.from,
			dateTo: filters.dateRange.to,
			periodDays: filters.periodDays,
			page,
		})

		const startTime = Date.now()
		const result = await getBacklogReports(filters, page)
		const queryTime = Date.now() - startTime

		console.log(
			`✅ [BacklogReports Action] Fetched ${result.data.length} reports (total: ${result.totalCount}) in ${queryTime}ms`
		)

		return { success: true, data: result }
	} catch (error) {
		console.error('❌ [BacklogReports] fetchBacklogReports error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch reports',
		}
	}
}

/**
 * Fetch a single backlog report by ID
 */
export async function fetchBacklogReportById(
	reportId: string
): Promise<{
	success: boolean
	data?: BacklogReport
	error?: string
}> {
	try {
		const startTime = Date.now()
		const report = await getBacklogReportById(reportId)
		const queryTime = Date.now() - startTime

		if (!report) {
			return { success: false, error: 'Report not found' }
		}

		console.log(`✅ [BacklogReports] Fetched report ${reportId} in ${queryTime}ms`)

		return { success: true, data: report }
	} catch (error) {
		console.error('❌ [BacklogReports] fetchBacklogReportById error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch report',
		}
	}
}

/**
 * Trigger report generation via n8n webhook
 */
export async function generateReport(
	periodDays: number
): Promise<{ success: boolean; error?: string }> {
	try {
		console.log(`🔄 [BacklogReports] Triggering report generation for ${periodDays} days`)
		const result = await triggerReportGeneration(periodDays)

		if (result.success) {
			console.log('✅ [BacklogReports] Report generation triggered successfully')
		} else {
			console.error('❌ [BacklogReports] Report generation failed:', result.error)
		}

		return result
	} catch (error) {
		console.error('❌ [BacklogReports] generateReport error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to trigger generation',
		}
	}
}

/**
 * Get the latest report timestamp for polling
 */
export async function fetchLatestReportTimestamp(): Promise<{
	success: boolean
	data?: string | null
	error?: string
}> {
	try {
		const timestamp = await getLatestReportTimestamp()
		return { success: true, data: timestamp }
	} catch (error) {
		console.error('❌ [BacklogReports] fetchLatestReportTimestamp error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch timestamp',
		}
	}
}
