import { supabaseServer } from '../server'
import type { BacklogReport, BacklogReportsFilters } from '../types'

/**
 * Fetch paginated list of backlog reports
 */
export async function getBacklogReports(
	filters: BacklogReportsFilters,
	page: number = 0,
	pageSize: number = 10
): Promise<{ data: BacklogReport[]; totalCount: number }> {
	const { dateRange, periodDays, minTickets, searchQuery } = filters

	// Convert dates if they came as strings (from Server Action serialization)
	const fromDate = dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from)
	const toDate = dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to)

	// Select only needed fields to reduce Disk IO
	const BACKLOG_REPORT_FIELDS = 'id, created_at, period_days, date_from, date_to, total_tickets, stats, weekly_stats, executive_summary, main_patterns, temporal_trends, specific_issues, recommendations'

	let query = supabaseServer
		.from('backlog_reports')
		.select(BACKLOG_REPORT_FIELDS, { count: 'exact' })
		.gte('created_at', fromDate.toISOString())
		.lt('created_at', toDate.toISOString())
		.order('created_at', { ascending: false })

	if (periodDays) {
		query = query.eq('period_days', periodDays)
	}

	if (minTickets) {
		query = query.gte('total_tickets', minTickets)
	}

	if (searchQuery && searchQuery.trim()) {
		// Search in executive_summary using ilike
		query = query.ilike('executive_summary', `%${searchQuery}%`)
	}

	// Pagination
	query = query.range(page * pageSize, (page + 1) * pageSize - 1)

	const { data, error, count } = await query

	if (error) throw error

	return {
		data: (data as BacklogReport[]) || [],
		totalCount: count || 0,
	}
}

/**
 * Fetch a single backlog report by ID
 */
export async function getBacklogReportById(
	reportId: string
): Promise<BacklogReport | null> {
	const BACKLOG_REPORT_FIELDS = 'id, created_at, period_days, date_from, date_to, total_tickets, stats, weekly_stats, executive_summary, main_patterns, temporal_trends, specific_issues, recommendations'

	const { data, error } = await supabaseServer
		.from('backlog_reports')
		.select(BACKLOG_REPORT_FIELDS)
		.eq('id', reportId)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null // Not found
		throw error
	}

	return data as BacklogReport
}

/**
 * Trigger report generation via n8n webhook
 */
export async function triggerReportGeneration(
	periodDays: number
): Promise<{ success: boolean; error?: string }> {
	try {
		const webhookUrl = process.env.N8N_WEBHOOK_URL
		const apiKey = process.env.N8N_X_API_KEY

		console.log('📤 [Webhook] Starting report generation request')
		console.log('📤 [Webhook] URL:', webhookUrl ? `${webhookUrl.substring(0, 50)}...` : 'NOT SET')
		console.log('📤 [Webhook] API Key:', apiKey ? 'SET (hidden)' : 'NOT SET')
		console.log('📤 [Webhook] Period days:', periodDays)

		if (!webhookUrl) {
			throw new Error('N8N_WEBHOOK_URL environment variable is not set')
		}

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		}

		if (apiKey) {
			headers['X-API-Key'] = apiKey
		}

		console.log('📤 [Webhook] Headers:', Object.keys(headers).join(', '))

		// No timeout - let n8n workflow complete (can take 10+ minutes)
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({ period_days: periodDays }),
		})

		console.log('📥 [Webhook] Response status:', response.status)
		console.log('📥 [Webhook] Response statusText:', response.statusText)

		if (!response.ok) {
			// Try to get response body for more details
			let responseBody = ''
			try {
				responseBody = await response.text()
				console.log('📥 [Webhook] Response body:', responseBody)
			} catch {
				console.log('📥 [Webhook] Could not read response body')
			}
			throw new Error(`Webhook failed: ${response.status} ${response.statusText}${responseBody ? ` - ${responseBody}` : ''}`)
		}

		const responseData = await response.text()
		console.log('✅ [Webhook] Success response:', responseData)

		return { success: true }
	} catch (error) {
		console.error('❌ [Webhook] Error:', error)
		return {
			success: false,
			error:
				error instanceof Error ? error.message : 'Failed to trigger generation',
		}
	}
}

/**
 * Get the latest report created_at timestamp for polling
 */
export async function getLatestReportTimestamp(): Promise<string | null> {
	const { data, error } = await supabaseServer
		.from('backlog_reports')
		.select('created_at')
		.order('created_at', { ascending: false })
		.limit(1)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null // No reports
		throw error
	}

	return (data as { created_at: string } | null)?.created_at || null
}
