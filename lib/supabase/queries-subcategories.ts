/**
 * Subcategories Statistics Queries
 *
 * Fetches statistics grouped by category (request_subtype) and subcategory (request_sub_subtype)
 * Shows AI quality performance per subcategory
 * Uses SQL RPC function for server-side aggregation (single query)
 * Excludes categories with commas in the name (merged categories)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'

export interface SubcategoryStats {
	category: string // request_subtype
	subcategory: string // request_sub_subtype
	total: number
	changed: number
	unchanged: number
	quality_percentage: number
	// Classification breakdown
	critical_error: number
	meaningful_improvement: number
	stylistic_preference: number
	no_significant_change: number
	context_shift: number
}

export interface CategoryGroup {
	category: string
	total: number
	quality_percentage: number
	subcategories: SubcategoryStats[]
}

/**
 * Fetch subcategories statistics grouped by category
 * Uses SQL RPC function for server-side aggregation (single query)
 * Only includes records from qualified agents
 * Excludes categories with commas in the name
 */
export async function fetchSubcategoriesStats(
	supabase: SupabaseClient,
	filters: {
		dateRange: { from: Date; to: Date }
		versions?: string[]
		agents?: string[]
	}
): Promise<CategoryGroup[]> {
	const { dateRange, versions, agents } = filters

	const { data, error } = await (supabase as any).rpc(
		'get_subcategories_stats',
		{
			p_date_from: dateRange.from.toISOString(),
			p_date_to: dateRange.to.toISOString(),
			p_qualified_agents: [...QUALIFIED_AGENTS],
			p_versions: versions?.length ? versions : null,
			p_agents: agents?.length ? agents : null,
		}
	)

	if (error) throw error
	if (!data || data.length === 0) return []

	// Group subcategory rows into CategoryGroup structure
	const categoryMap = new Map<string, SubcategoryStats[]>()

	for (const row of data as any[]) {
		const stats: SubcategoryStats = {
			category: row.category,
			subcategory: row.subcategory,
			total: Number(row.total),
			changed: Number(row.changed),
			unchanged: Number(row.unchanged),
			quality_percentage: Number(row.quality_percentage),
			critical_error: Number(row.critical_error),
			meaningful_improvement: Number(row.meaningful_improvement),
			stylistic_preference: Number(row.stylistic_preference),
			no_significant_change: Number(row.no_significant_change),
			context_shift: Number(row.context_shift),
		}

		if (!categoryMap.has(row.category)) {
			categoryMap.set(row.category, [])
		}
		categoryMap.get(row.category)!.push(stats)
	}

	// Build CategoryGroup array with category-level aggregates
	const result: CategoryGroup[] = []

	for (const [category, subcategories] of categoryMap.entries()) {
		// Sort subcategories by total descending
		subcategories.sort((a, b) => b.total - a.total)

		let categoryChanged = 0
		let categoryUnchanged = 0
		for (const sub of subcategories) {
			categoryChanged += sub.changed
			categoryUnchanged += sub.unchanged
		}

		const categoryTotal = categoryChanged + categoryUnchanged
		const categoryQuality =
			categoryTotal > 0
				? Math.round((categoryUnchanged / categoryTotal) * 100)
				: 0

		result.push({
			category,
			total: categoryTotal,
			quality_percentage: categoryQuality,
			subcategories,
		})
	}

	// Sort categories by total descending
	result.sort((a, b) => b.total - a.total)

	return result
}
