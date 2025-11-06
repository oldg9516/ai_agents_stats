'use server'

/**
 * Support Overview Server Actions
 *
 * Server-side functions using SERVICE ROLE key to bypass RLS
 * This is necessary because support_threads_data has RLS enabled
 */

import {
	fetchCorrelationMatrix,
	fetchRequestCategoryStats,
	fetchResolutionTimeData,
	fetchSankeyData,
	fetchStatusDistribution,
	fetchSupportKPIs,
	fetchSupportThreads,
} from '@/lib/supabase/queries-support'
import { supabaseServer } from '@/lib/supabase/server'
import type { SupportFilters } from '@/lib/supabase/types'

/**
 * Fetch all support overview data in one Server Action
 * Returns all KPIs, charts, and table data
 */
export async function fetchSupportData(filters: SupportFilters) {
	try {
		// Fetch all data in parallel for best performance
		// Using supabaseServer with SERVICE ROLE key to bypass RLS
		const serverClient = supabaseServer

		// KPIs and charts can process smaller datasets for better performance
		// Threads table has pagination (limit 50 by default for faster initial load)
		const promises = [
			fetchSupportKPIs(serverClient, filters),
			fetchStatusDistribution(serverClient, filters),
			fetchResolutionTimeData(serverClient, filters),
			fetchSankeyData(serverClient, filters),
			fetchCorrelationMatrix(serverClient, filters),
			fetchSupportThreads(serverClient, filters, { limit: 50, offset: 0 }),
		]

		// Track individual query times
		const results = await Promise.all(
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
					const queryTime = Date.now() - queryStart
					console.log(`✅ [Support] ${names[index]} took ${queryTime}ms`)
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
		const stats = await fetchRequestCategoryStats(supabaseServer, dateRange)

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
		const startTime = Date.now()
		const threads = await fetchSupportThreads(supabaseServer, filters, pagination)
		const queryTime = Date.now() - startTime
		console.log(`✅ [Support Threads Action] Fetched ${threads.length} threads in ${queryTime}ms`)

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
 * Fetch minimum created_at date from support_threads_data
 * Used for "All Time" filter
 */
export async function fetchSupportMinCreatedDate(): Promise<Date> {
	try {
		console.log('🚀 [Support MinDate] Fetching minimum created_at date...')
		const startTime = Date.now()

		const { data, error } = await supabaseServer
			.from('support_threads_data')
			.select('created_at')
			.order('created_at', { ascending: true })
			.limit(1)
			.single<{ created_at: string }>()

		if (error) throw error
		if (!data) throw new Error('No data returned')

		const totalTime = Date.now() - startTime
		console.log(`🏁 [Support MinDate] Fetch time: ${totalTime}ms (date: ${data.created_at})`)

		return new Date(data.created_at)
	} catch (error) {
		console.error('❌ [Support MinDate] Error:', error)
		// Fallback to a safe default date
		return new Date('2024-01-01')
	}
}
