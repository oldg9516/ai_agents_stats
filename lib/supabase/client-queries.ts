/**
 * Client-side Supabase queries
 *
 * These functions use the client-side Supabase instance
 * and can be called from browser components
 */

import { supabase } from './client'
import type { AIHumanComparisonRow, FilterOptions } from './types'

/**
 * Get filter options (versions and categories) - Client version
 *
 * This version uses the client-side Supabase instance
 * Safe to call from browser/client components
 */
/**
 * @deprecated Use fetchFilterOptions from dashboard-actions instead
 * This client-side version may fail due to RLS policies
 * Server Actions use service_role key to bypass RLS
 */
export async function getFilterOptions(): Promise<FilterOptions> {
	const { data, error } = await supabase
		.from('ai_human_comparison')
		.select('prompt_version, request_subtype')

	if (error) {
		console.error('Error fetching filter options:', error)
		return { versions: [], categories: [], agents: [] }
	}

	if (!data) return { versions: [], categories: [], agents: [] }

	const records = data as unknown as AIHumanComparisonRow[]

	const versions = [
		...new Set(
			records.map(r => r.prompt_version).filter((v): v is string => v !== null)
		),
	].sort()

	const categories = [
		...new Set(
			records.map(r => r.request_subtype).filter((c): c is string => c !== null)
		),
	].sort()

	const agents = [
		...new Set(
			records.map(r => r.email).filter((e): e is string => e !== null)
		),
	].sort()

	return { versions, categories, agents }
}
