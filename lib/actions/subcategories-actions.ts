/**
 * Subcategories Statistics Server Actions
 */

'use server'

import { supabaseServer } from '@/lib/supabase/server'
import {
	fetchSubcategoriesStats,
	type CategoryGroup,
} from '@/lib/supabase/queries-subcategories'

interface SubcategoriesFilters {
	dateRange: { from: Date; to: Date }
	versions?: string[]
	agents?: string[]
}

/**
 * Fetch subcategories statistics grouped by category
 */
export async function fetchSubcategoriesData(
	filters: SubcategoriesFilters
): Promise<CategoryGroup[]> {
	const startTime = performance.now()

	try {
		console.log('🔍 [Subcategories] Fetching data...', {
			dateRange: filters.dateRange,
			versions: filters.versions?.length || 0,
			agents: filters.agents?.length || 0,
		})

		const data = await fetchSubcategoriesStats(supabaseServer, filters)

		const duration = performance.now() - startTime
		console.log(
			`✅ [Subcategories] Data fetched in ${duration.toFixed(0)}ms:`,
			{
				categories: data.length,
				totalSubcategories: data.reduce(
					(sum, cat) => sum + cat.subcategories.length,
					0
				),
			}
		)

		return data
	} catch (error) {
		const duration = performance.now() - startTime
		console.error(
			`❌ [Subcategories] Error after ${duration.toFixed(0)}ms:`,
			error
		)
		throw error
	}
}
