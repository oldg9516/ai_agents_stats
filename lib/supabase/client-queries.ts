/**
 * Client-side Supabase queries
 *
 * These functions use the client-side Supabase instance
 * and can be called from browser components
 */

import { supabase } from './client'
import type { FilterOptions, AIHumanComparisonRow } from './types'

/**
 * Get filter options (versions and categories) - Client version
 *
 * This version uses the client-side Supabase instance
 * Safe to call from browser/client components
 */
export async function getFilterOptions(): Promise<FilterOptions> {
	const { data, error } = await supabase
		.from('ai_human_comparison')
		.select('prompt_version, request_subtype')

	if (error) {
		console.error('Error fetching filter options:', error)
		return { versions: [], categories: [] }
	}

	if (!data) return { versions: [], categories: [] }

	const records = data as unknown as AIHumanComparisonRow[]

	const versions = [
		...new Set(
			records.map((r) => r.prompt_version).filter((v): v is string => v !== null)
		),
	].sort()

	const categories = [
		...new Set(
			records.map((r) => r.request_subtype).filter((c): c is string => c !== null)
		),
	].sort()

	return { versions, categories }
}
