'use server'

/**
 * Support Overview Server Actions
 *
 * Server-side functions using SERVICE ROLE key to bypass RLS
 * This is necessary because support_threads_data has RLS enabled
 */

import {
	fetchAvailableCategories,
	fetchCorrelationMatrix,
	fetchRequestCategoryStats,
	fetchResolutionTimeData,
	fetchSankeyData,
	fetchStatusDistribution,
	fetchSupportKPIs,
	fetchSupportThreads,
} from '@/lib/db/queries-support'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { SupportFilters } from '@/lib/db/types'

// Request timeout constant (30 seconds)
const REQUEST_TIMEOUT = 30000

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise(ms: number, operationName: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(
			() => reject(new Error(`${operationName} timed out after ${ms}ms`)),
			ms
		)
	)
}

/**
 * Fetch all support overview data in one Server Action
 * Returns all KPIs, charts, and table data
 * Includes 30s timeout protection to prevent hanging requests
 */
export async function fetchSupportData(filters: SupportFilters) {
	try {
		// Fetch all data in parallel for best performance
		// KPIs and charts can process smaller datasets for better performance
		// Threads table has pagination (limit 50 by default for faster initial load)
		const promises = [
			fetchSupportKPIs(filters),
			fetchStatusDistribution(filters),
			fetchResolutionTimeData(filters),
			fetchSankeyData(filters),
			fetchCorrelationMatrix(filters),
			fetchSupportThreads(filters, { limit: 50, offset: 0 }),
		]

		// Track individual query times
		const dataPromise = Promise.all(
			promises.map(async (promise, index) => {
				const queryStart = Date.now()
				const names = [
					'KPIs',
					'StatusDist',
					'ResolutionTime',
					'Sankey',
					'Correlation',
					'Threads',
				]
				try {
					const result = await promise
					return result
				} catch (error) {
					const queryTime = Date.now() - queryStart
					console.error(
						`❌ [Support] ${names[index]} failed after ${queryTime}ms:`,
						error
					)
					throw error
				}
			})
		)

		// Add timeout protection
		const results = await Promise.race([
			dataPromise,
			createTimeoutPromise(REQUEST_TIMEOUT, 'Support data fetch'),
		])

		const [
			kpis,
			statusDist,
			resolutionTime,
			sankeyData,
			correlationMatrix,
			threads,
		] = results

		return {
			success: true,
			data: {
				kpis,
				statusDistribution: statusDist,
				resolutionTime,
				sankeyData,
				correlationMatrix,
				threads,
			},
		}
	} catch (error) {
		console.error('❌ [Server Action] Error fetching support data:', error)
		return {
			success: false,
			error:
				error instanceof Error ? error.message : 'Failed to fetch support data',
		}
	}
}

/**
 * Fetch Request Category Statistics
 * Returns breakdown of request types and subtypes with counts and percentages
 */
export async function fetchRequestCategoryStatsAction(dateRange: {
	from: Date
	to: Date
}) {
	try {
		const stats = await fetchRequestCategoryStats(dateRange)

		return {
			success: true,
			data: stats,
		}
	} catch (error) {
		console.error(
			'❌ [Server Action] Error fetching request category stats:',
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch request category stats',
		}
	}
}

/**
 * Fetch support threads with pagination
 * Separate action for paginated loading
 */
export async function fetchSupportThreadsAction(
	filters: SupportFilters,
	pagination?: { limit: number; offset: number }
) {
	try {
		const threads = await fetchSupportThreads(
			filters,
			pagination
		)

		return {
			success: true,
			data: threads,
		}
	} catch (error) {
		console.error('❌ [Server Action] Error fetching support threads:', error)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch support threads',
			data: null,
		}
	}
}

/**
 * Fetch ALL support threads for CSV export (no pagination limit)
 * This fetches all records matching the filters for export purposes
 */
export async function fetchAllSupportThreadsForExport(filters: SupportFilters) {
	try {
		// Fetch all threads in batches (fetchAll: true bypasses Supabase 1000 limit)
		const threads = await fetchSupportThreads(filters, {
			fetchAll: true,
		})

		return {
			success: true,
			data: threads,
			count: threads.length,
		}
	} catch (error) {
		console.error(
			'❌ [Server Action] Error fetching all support threads for export:',
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch threads for export',
			data: null,
			count: 0,
		}
	}
}

/**
 * Fetch minimum created_at date from support_threads_data
 * Used for "All Time" filter
 * Uses RPC with MIN() for optimal performance
 */
export async function fetchSupportMinCreatedDate(): Promise<Date> {
	try {
		const result = await db.execute(sql`SELECT * FROM get_support_min_created_date()`)
		const value = result.rows[0]?.get_support_min_created_date

		if (!value) throw new Error('No data returned')

		return new Date(value as string)
	} catch (error) {
		console.error('❌ [Support MinDate] Error:', error)
		// Fallback to a safe default date
		return new Date('2024-01-01')
	}
}

/**
 * Fetch all unique categories (request_subtype) for filter dropdown
 * Returns categories sorted: single categories first, then multi-categories
 */
export async function fetchAvailableCategoriesAction(dateRange: {
	from: Date
	to: Date
}) {
	try {
		const categories = await fetchAvailableCategories(dateRange)

		return {
			success: true,
			data: categories,
		}
	} catch (error) {
		console.error(
			'❌ [Server Action] Error fetching available categories:',
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch available categories',
			data: [] as string[],
		}
	}
}
