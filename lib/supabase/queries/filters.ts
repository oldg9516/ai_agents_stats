import { endOfDay, startOfDay, subDays } from 'date-fns'
import { supabaseServer } from '../server'
import type { DashboardFilters, FilterOptions } from '../types'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

/**
 * Get minimum created_at date from database
 * Used for "All Time" filter preset
 */
export async function getMinCreatedDate(): Promise<Date> {
	const { data, error } = await supabase.rpc('get_min_created_date')

	if (error) throw error
	if (!data) return new Date('2020-01-01') // Fallback

	return new Date(data)
}

/**
 * Get filter options (versions, categories, and agents)
 * @param dateRange - Optional date range to filter options (only show options with records in this period)
 */
export async function getFilterOptions(dateRange?: {
	from: Date
	to: Date
}): Promise<FilterOptions> {
	// Get versions and categories from RPC
	// @ts-expect-error - Supabase RPC types not fully generated yet
	const { data, error } = await supabase.rpc('get_filter_options', {
		p_from_date: dateRange ? dateRange.from.toISOString() : null,
		p_to_date: dateRange ? dateRange.to.toISOString() : null,
	})

	if (error) throw error

	// Get agents separately (email field)
	let agentsQuery = supabase.from('ai_human_comparison').select('email')

	if (dateRange) {
		agentsQuery = agentsQuery
			.gte('created_at', dateRange.from.toISOString())
			.lt('created_at', dateRange.to.toISOString())
	}

	const { data: agentsData } = await agentsQuery

	// Extract unique agents
	const agents = Array.from(
		new Set(
			(agentsData as { email: string | null }[] | null)
				?.map(r => r.email)
				.filter(Boolean) as string[]
		)
	).sort()

	// @ts-expect-error - data type inferred as never but we know it's an array
	if (!data || data.length === 0)
		return { versions: [], categories: [], agents }

	// RPC returns array with one row containing { versions: string[], categories: string[] }
	const result = data[0] as {
		versions: string[] | null
		categories: string[] | null
	}

	return {
		versions: result.versions || [],
		categories: result.categories || [],
		agents,
	}
}

/**
 * Get default filters (Last 30 days, all versions, all categories)
 */
export function getDefaultFilters(): DashboardFilters {
	const to = endOfDay(new Date())
	const from = startOfDay(subDays(to, 30))

	return {
		dateRange: { from, to },
		versions: [],
		categories: [],
		agents: [],
	}
}
