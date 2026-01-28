/**
 * Subcategories Statistics Queries
 *
 * Fetches statistics grouped by category (request_subtype) and subcategory (request_sub_subtype)
 * Shows AI quality performance per subcategory
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
 * Uses batched requests to avoid headers overflow
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

	// Fetch unique categories and subcategories first
	const { data: categoriesData, error: categoriesError } = await supabase
		.from('support_threads_data')
		.select('request_subtype, request_sub_subtype')
		.gte('thread_date', dateRange.from.toISOString())
		.lt('thread_date', dateRange.to.toISOString())
		.not('request_subtype', 'is', null)
		.not('request_sub_subtype', 'is', null)
		.not('request_subtype', 'like', '%,%') // Exclude categories with commas

	if (categoriesError) throw categoriesError
	if (!categoriesData || categoriesData.length === 0) return []

	// Group unique category/subcategory pairs
	const categoryPairs = new Map<string, Set<string>>()
	categoriesData.forEach(item => {
		if (!item.request_subtype || !item.request_sub_subtype) return
		if (!categoryPairs.has(item.request_subtype)) {
			categoryPairs.set(item.request_subtype, new Set())
		}
		categoryPairs.get(item.request_subtype)!.add(item.request_sub_subtype)
	})

	// Now fetch data for each category/subcategory pair
	const statsMap = new Map<string, Map<string, SubcategoryStats>>()

	for (const [category, subcategories] of categoryPairs.entries()) {
		for (const subcategory of subcategories) {
			// Get thread IDs for this specific category/subcategory
			const { data: threads } = await supabase
				.from('support_threads_data')
				.select('thread_id')
				.gte('thread_date', dateRange.from.toISOString())
				.lt('thread_date', dateRange.to.toISOString())
				.eq('request_subtype', category)
				.eq('request_sub_subtype', subcategory)
				.limit(500)

			if (!threads || threads.length === 0) continue

			const threadIds = threads.map(t => t.thread_id).filter(Boolean) as string[]

			// Fetch comparisons for these threads
			let comparisonQuery = supabase
				.from('ai_human_comparison')
				.select('changed, change_classification')
				.in('thread_id', threadIds)
				.in('email', QUALIFIED_AGENTS)
				.neq('email', 'api@levhaolam.com')
				.not('change_classification', 'is', null)

			// Apply filters
			if (versions && versions.length > 0) {
				comparisonQuery = comparisonQuery.in('prompt_version', versions)
			}
			if (agents && agents.length > 0) {
				comparisonQuery = comparisonQuery.in('email', agents)
			}

			const { data: comparisons } = await comparisonQuery

			if (!comparisons || comparisons.length === 0) continue

			// Initialize stats for this subcategory
			if (!statsMap.has(category)) {
				statsMap.set(category, new Map())
			}
			const categoryMap = statsMap.get(category)!
			if (!categoryMap.has(subcategory)) {
				categoryMap.set(subcategory, {
					category,
					subcategory,
					total: 0,
					changed: 0,
					unchanged: 0,
					quality_percentage: 0,
					critical_error: 0,
					meaningful_improvement: 0,
					stylistic_preference: 0,
					no_significant_change: 0,
					context_shift: 0,
				})
			}

			const stats = categoryMap.get(subcategory)!

			// Aggregate statistics
			comparisons.forEach(comparison => {
				stats.total++

				// Count changed/unchanged (excluding context_shift)
				if (comparison.change_classification !== 'context_shift') {
					if (comparison.changed) {
						stats.changed++
					} else {
						stats.unchanged++
					}
				}

				// Count by classification
				const classification = comparison.change_classification
				if (classification === 'critical_error') stats.critical_error++
				else if (classification === 'meaningful_improvement')
					stats.meaningful_improvement++
				else if (classification === 'stylistic_preference')
					stats.stylistic_preference++
				else if (classification === 'no_significant_change')
					stats.no_significant_change++
				else if (classification === 'context_shift') stats.context_shift++
			})
		}
	}

	// Calculate quality percentages and build result
	const result: CategoryGroup[] = []

	statsMap.forEach((subcategoriesMap, category) => {
		const subcategories: SubcategoryStats[] = []
		let categoryTotal = 0
		let categoryUnchanged = 0

		subcategoriesMap.forEach(stats => {
			// Calculate quality percentage (excluding context_shift)
			const totalNonContext = stats.changed + stats.unchanged
			stats.quality_percentage =
				totalNonContext > 0
					? Math.round((stats.unchanged / totalNonContext) * 100)
					: 0

			subcategories.push(stats)
			categoryTotal += totalNonContext
			categoryUnchanged += stats.unchanged
		})

		// Sort subcategories by total count descending
		subcategories.sort((a, b) => b.total - a.total)

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
	})

	// Sort categories by total count descending
	result.sort((a, b) => b.total - a.total)

	return result
}
