/**
 * Subcategories Statistics Server Actions
 */

'use server'

import {
	fetchSubcategoriesStats,
	type CategoryGroup,
} from '@/lib/db/queries-subcategories'

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
		const data = await fetchSubcategoriesStats(filters)

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
