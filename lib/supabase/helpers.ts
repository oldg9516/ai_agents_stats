import type { SupabaseClient } from '@supabase/supabase-js'
import type { DateFilterMode, TrendData } from './types'

// Batch fetching constants
const DEFAULT_BATCH_SIZE = 500
const DEFAULT_MAX_CONCURRENT = 3

/**
 * Filter configuration for batch fetching
 */
export interface BatchFetchFilters {
	dateRange: { from: Date; to: Date }
	// Optional filters - each query function can choose which to apply
	versions?: string[]
	categories?: string[]
	agents?: string[]
	statuses?: string[]
	requestTypes?: string[]
	requirements?: string[]
	dateFilterMode?: DateFilterMode
	hideRequiresEditing?: boolean // Show only records where support_threads_data.requires_editing = true
	includedThreadIds?: string[] // Pre-fetched thread_ids to INCLUDE (whitelist for showOnlyRequiresEditing)
}

/**
 * Options for batch fetching
 */
export interface BatchFetchOptions {
	batchSize?: number
	maxConcurrent?: number
	dateField?: string // Field name for date filtering (default: 'created_at')
}

/**
 * Generic batch fetch utility that bypasses Supabase's 1000 record limit
 * Works with any table and filter combination
 *
 * @param supabase - Supabase client instance
 * @param tableName - Name of the table to query
 * @param selectFields - Fields to select (e.g., 'id, name, created_at')
 * @param filters - Filter configuration
 * @param applyFilters - Function to apply additional filters to query
 * @param options - Batch fetching options
 */
export async function fetchAllInBatchesGeneric<T>(
	supabase: SupabaseClient,
	tableName: string,
	selectFields: string,
	filters: BatchFetchFilters,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	applyFilters?: (query: any, filters: BatchFetchFilters) => any,
	options?: BatchFetchOptions
): Promise<T[]> {
	const { dateRange, dateFilterMode } = filters
	const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE
	const maxConcurrent = options?.maxConcurrent ?? DEFAULT_MAX_CONCURRENT
	// Use dateFilterMode from filters, or fall back to options.dateField, or default to 'created_at'
	const dateField = dateFilterMode === 'human_reply'
		? 'human_reply_date'
		: (options?.dateField ?? 'created_at')

	// First, get total count
	let countQuery = supabase
		.from(tableName)
		.select('id', { count: 'exact', head: true })
		.gte(dateField, dateRange.from.toISOString())
		.lt(dateField, dateRange.to.toISOString())

	// Apply additional filters if provided
	if (applyFilters) {
		countQuery = applyFilters(countQuery, filters)
	}

	const { count, error: countError } = await countQuery

	if (countError) {
		console.error(`❌ [BatchFetch] Count error for ${tableName}:`, countError)
		throw countError
	}

	const totalRecords = count || 0
	if (totalRecords === 0) return []

	// Fetch in batches with limited concurrency
	const numBatches = Math.ceil(totalRecords / batchSize)
	const results: T[] = []
	const errors: Error[] = []

	for (let batchStart = 0; batchStart < numBatches; batchStart += maxConcurrent) {
		const batchPromises: Promise<T[]>[] = []

		for (let i = batchStart; i < Math.min(batchStart + maxConcurrent, numBatches); i++) {
			const offset = i * batchSize

			const promise = (async () => {
				let query = supabase
					.from(tableName)
					.select(selectFields)
					.gte(dateField, dateRange.from.toISOString())
					.lt(dateField, dateRange.to.toISOString())
					.range(offset, offset + batchSize - 1)

				// Apply additional filters if provided
				if (applyFilters) {
					query = applyFilters(query, filters)
				}

				const { data, error } = await query

				if (error) {
					console.error(`❌ [BatchFetch] Batch ${i} error for ${tableName}:`, error)
					throw error
				}

				return (data || []) as T[]
			})()

			batchPromises.push(promise)
		}

		try {
			const batchResults = await Promise.all(batchPromises)
			results.push(...batchResults.flat())
		} catch (error) {
			errors.push(error as Error)
			// Continue fetching remaining batches but track errors
		}

		// Small delay between batch groups to avoid rate limiting
		if (batchStart + maxConcurrent < numBatches) {
			await new Promise(resolve => setTimeout(resolve, 50))
		}
	}

	// If we had errors but got some data, log warning but return partial results
	if (errors.length > 0) {
		console.warn(`⚠️ [BatchFetch] ${errors.length} batch errors for ${tableName}, returning ${results.length} records`)
	}

	return results
}

/**
 * Calculate trend data from current and previous values
 */
export function calculateTrend(current: number, previous: number): TrendData {
	const value = current - previous
	const percentage =
		previous === 0 ? 0 : ((current - previous) / previous) * 100

	let direction: 'up' | 'down' | 'neutral' = 'neutral'
	if (value > 0) direction = 'up'
	else if (value < 0) direction = 'down'

	return {
		value: Math.abs(value),
		percentage: Math.abs(percentage),
		direction,
	}
}

/**
 * Get date range for previous period (same duration as current)
 */
export function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
	const duration = to.getTime() - from.getTime()
	const previousTo = new Date(from.getTime() - 1) // 1ms before current from
	const previousFrom = new Date(previousTo.getTime() - duration)

	return {
		from: previousFrom,
		to: previousTo,
	}
}

/**
 * Extract numeric version from version string (e.g., "v1" -> 1, "v2" -> 2)
 */
export function extractVersionNumber(version: string): number {
	const match = version.match(/\d+/)
	return match ? parseInt(match[0]) : 0
}

/**
 * Get week start date (Monday) in ISO format
 */
export function getWeekStart(date: Date): string {
	const day = date.getDay()
	const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
	const monday = new Date(date.setDate(diff))
	monday.setHours(0, 0, 0, 0)
	return monday.toISOString()
}

/**
 * Get day start date in ISO format
 */
export function getDayStart(date: Date): string {
	const dayStart = new Date(date)
	dayStart.setHours(0, 0, 0, 0)
	return dayStart.toISOString()
}

/**
 * Format date as DD.MM.YYYY
 */
export function formatDate(date: Date): string {
	const day = String(date.getDate()).padStart(2, '0')
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const year = date.getFullYear()
	return `${day}.${month}.${year}`
}

/**
 * Fetch thread_ids from support_threads_data where requires_editing = true
 * Used as whitelist when "Show Only Requires Editing" filter is enabled
 * SQL uses: thread_id = ANY(includedThreadIds) to include ONLY these records
 *
 * @param supabase - Supabase client instance
 * @returns Array of thread_ids to INCLUDE (those that require editing)
 */
export async function fetchRequiresEditingThreadIds(
	supabase: SupabaseClient
): Promise<string[]> {
	const BATCH_SIZE = 1000
	const results: string[] = []

	// Fetch all thread_ids where requires_editing = true (whitelist)
	let offset = 0
	let hasMore = true

	while (hasMore) {
		const { data, error } = await supabase
			.from('support_threads_data')
			.select('thread_id')
			.eq('requires_editing', true)
			.range(offset, offset + BATCH_SIZE - 1)

		if (error) {
			console.error('❌ [fetchRequiresEditingThreadIds] Error:', error)
			break
		}

		if (data && data.length > 0) {
			results.push(...data.map((d: { thread_id: string }) => d.thread_id))
			offset += BATCH_SIZE
			hasMore = data.length === BATCH_SIZE
		} else {
			hasMore = false
		}
	}

	return results
}
