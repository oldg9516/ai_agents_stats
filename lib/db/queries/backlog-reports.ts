/**
 * Backlog Reports Database Queries (Drizzle)
 *
 * Replaces Supabase direct table queries with Drizzle query builder.
 * No batch fetching needed — direct pg has no row limit.
 */

import { db } from '../index'
import { sql, and, gte, lt, eq, ilike, desc, count } from 'drizzle-orm'
import { backlogReports } from '../schema'
import type { BacklogReport, BacklogReportsFilters } from '../types'
import { getN8nWebhookUrl, getN8nApiKey } from '@/lib/utils/env'

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
	const fromDate =
		dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from)
	const toDate =
		dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to)

	// Build conditions
	const conditions = [
		gte(backlogReports.createdAt, fromDate),
		lt(backlogReports.createdAt, toDate),
	]

	if (periodDays) {
		conditions.push(eq(backlogReports.periodDays, periodDays))
	}

	if (minTickets) {
		conditions.push(gte(backlogReports.totalTickets, minTickets))
	}

	if (searchQuery && searchQuery.trim()) {
		conditions.push(
			ilike(backlogReports.executiveSummary, `%${searchQuery}%`)
		)
	}

	const whereClause = and(...conditions)

	// Parallel: data + count
	const [data, countResult] = await Promise.all([
		db
			.select({
				id: backlogReports.id,
				createdAt: backlogReports.createdAt,
				periodDays: backlogReports.periodDays,
				dateFrom: backlogReports.dateFrom,
				dateTo: backlogReports.dateTo,
				totalTickets: backlogReports.totalTickets,
				stats: backlogReports.stats,
				weeklyStats: backlogReports.weeklyStats,
				executiveSummary: backlogReports.executiveSummary,
				mainPatterns: backlogReports.mainPatterns,
				temporalTrends: backlogReports.temporalTrends,
				specificIssues: backlogReports.specificIssues,
				recommendations: backlogReports.recommendations,
			})
			.from(backlogReports)
			.where(whereClause)
			.orderBy(desc(backlogReports.createdAt))
			.limit(pageSize)
			.offset(page * pageSize),
		db
			.select({ value: count() })
			.from(backlogReports)
			.where(whereClause),
	])

	// Map drizzle camelCase to snake_case for BacklogReport type compatibility
	const mapped: BacklogReport[] = data.map((row) => ({
		id: row.id,
		created_at: row.createdAt?.toISOString() ?? '',
		period_days: row.periodDays ?? 0,
		date_from: row.dateFrom ?? '',
		date_to: row.dateTo ?? '',
		total_tickets: row.totalTickets ?? 0,
		stats: row.stats as BacklogReport['stats'],
		weekly_stats: row.weeklyStats as BacklogReport['weekly_stats'],
		executive_summary: row.executiveSummary ?? '',
		main_patterns: (row.mainPatterns ?? []) as BacklogReport['main_patterns'],
		temporal_trends: (row.temporalTrends ??
			[]) as BacklogReport['temporal_trends'],
		specific_issues: (row.specificIssues ??
			[]) as BacklogReport['specific_issues'],
		recommendations: (row.recommendations ??
			[]) as BacklogReport['recommendations'],
	}))

	return {
		data: mapped,
		totalCount: Number(countResult[0]?.value ?? 0),
	}
}

/**
 * Fetch a single backlog report by ID
 */
export async function getBacklogReportById(
	reportId: string
): Promise<BacklogReport | null> {
	const rows = await db
		.select({
			id: backlogReports.id,
			createdAt: backlogReports.createdAt,
			periodDays: backlogReports.periodDays,
			dateFrom: backlogReports.dateFrom,
			dateTo: backlogReports.dateTo,
			totalTickets: backlogReports.totalTickets,
			stats: backlogReports.stats,
			weeklyStats: backlogReports.weeklyStats,
			executiveSummary: backlogReports.executiveSummary,
			mainPatterns: backlogReports.mainPatterns,
			temporalTrends: backlogReports.temporalTrends,
			specificIssues: backlogReports.specificIssues,
			recommendations: backlogReports.recommendations,
		})
		.from(backlogReports)
		.where(eq(backlogReports.id, reportId))
		.limit(1)

	const row = rows[0]
	if (!row) return null

	return {
		id: row.id,
		created_at: row.createdAt?.toISOString() ?? '',
		period_days: row.periodDays ?? 0,
		date_from: row.dateFrom ?? '',
		date_to: row.dateTo ?? '',
		total_tickets: row.totalTickets ?? 0,
		stats: row.stats as BacklogReport['stats'],
		weekly_stats: row.weeklyStats as BacklogReport['weekly_stats'],
		executive_summary: row.executiveSummary ?? '',
		main_patterns: (row.mainPatterns ?? []) as BacklogReport['main_patterns'],
		temporal_trends: (row.temporalTrends ??
			[]) as BacklogReport['temporal_trends'],
		specific_issues: (row.specificIssues ??
			[]) as BacklogReport['specific_issues'],
		recommendations: (row.recommendations ??
			[]) as BacklogReport['recommendations'],
	}
}

/**
 * Trigger report generation via n8n webhook
 */
export async function triggerReportGeneration(
	periodDays: number
): Promise<{ success: boolean; error?: string }> {
	try {
		const webhookUrl = getN8nWebhookUrl()
		const apiKey = getN8nApiKey()

		console.log('[Webhook] Starting report generation request')
		console.log(
			'[Webhook] URL:',
			webhookUrl ? `${webhookUrl.substring(0, 50)}...` : 'NOT SET'
		)
		console.log('[Webhook] API Key:', apiKey ? 'SET (hidden)' : 'NOT SET')
		console.log('[Webhook] Period days:', periodDays)

		if (!webhookUrl) {
			throw new Error(
				'N8N_WEBHOOK_URL environment variable is not set (check UAT_/PROD_ prefixed vars)'
			)
		}

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		}

		if (apiKey) {
			headers['X-API-Key'] = apiKey
		}

		console.log('[Webhook] Headers:', Object.keys(headers).join(', '))

		// No timeout - let n8n workflow complete (can take 10+ minutes)
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({ period_days: periodDays }),
		})

		console.log('[Webhook] Response status:', response.status)
		console.log('[Webhook] Response statusText:', response.statusText)

		if (!response.ok) {
			let responseBody = ''
			try {
				responseBody = await response.text()
				console.log('[Webhook] Response body:', responseBody)
			} catch {
				console.log('[Webhook] Could not read response body')
			}
			throw new Error(
				`Webhook failed: ${response.status} ${response.statusText}${responseBody ? ` - ${responseBody}` : ''}`
			)
		}

		const responseData = await response.text()
		console.log('[Webhook] Success response:', responseData)

		return { success: true }
	} catch (error) {
		console.error('[Webhook] Error:', error)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to trigger generation',
		}
	}
}

/**
 * Get the latest report created_at timestamp for polling
 */
export async function getLatestReportTimestamp(): Promise<string | null> {
	const rows = await db
		.select({ createdAt: backlogReports.createdAt })
		.from(backlogReports)
		.orderBy(desc(backlogReports.createdAt))
		.limit(1)

	return rows[0]?.createdAt?.toISOString() ?? null
}
