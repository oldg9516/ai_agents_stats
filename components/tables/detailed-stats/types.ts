import type { DashboardFilters, DetailedStatsRow } from '@/lib/supabase/types'

/**
 * Props for DetailedStatsTable component
 */
export interface DetailedStatsTableProps {
	filters: DashboardFilters
}

/**
 * Check if date is after new logic cutoff (11.11.2025)
 * Used to determine which columns to show for week-level rows
 */
export function isNewLogic(dates: string | null): boolean {
	if (!dates) return false // Version-level rows don't have dates

	// Extract SECOND date (end of week) from "DD.MM.YYYY — DD.MM.YYYY" format
	// This ensures that if the week includes 11.11.2025, it uses new logic
	const secondDate = dates.split(' — ')[1]
	const [day, month, year] = secondDate.split('.')
	const dateObj = new Date(`${year}-${month}-${day}`)
	const cutoffDate = new Date('2025-11-11')

	return dateObj >= cutoffDate
}

/**
 * Check if a row is the latest week for its category-version combination
 */
export function checkIsLatestWeek(
	row: DetailedStatsRow,
	latestWeeksByCategory: Map<string, string>
): boolean {
	if (row.sortOrder === 1 || !row.dates) return false

	const key = `${row.category}-${row.version}`
	const firstDate = row.dates.split(' — ')[0]
	const [day, month, year] = firstDate.split('.')
	const dateStr = `${year}-${month}-${day}`

	return latestWeeksByCategory.get(key) === dateStr
}

/**
 * Build map of latest weeks for each category-version combination
 */
export function buildLatestWeeksMap(
	data: DetailedStatsRow[]
): Map<string, string> {
	const latestMap = new Map<string, string>()

	data.forEach(row => {
		// Only process week-level rows (sortOrder !== 1)
		if (row.sortOrder !== 1 && row.dates) {
			const category = row.category
			const version = row.version
			const key = `${category}-${version}`

			// Extract first date from "DD.MM.YYYY — DD.MM.YYYY" format
			const firstDate = row.dates.split(' — ')[0]
			const [day, month, year] = firstDate.split('.')
			const dateStr = `${year}-${month}-${day}` // YYYY-MM-DD for comparison

			// Check if this is the latest date for this category-version
			const existing = latestMap.get(key)
			if (!existing || dateStr > existing) {
				latestMap.set(key, dateStr)
			}
		}
	})

	return latestMap
}

/**
 * Calculate percentage with safety check
 */
export function calcPercentage(count: number, total: number): string {
	return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
}

/**
 * Common cell styling based on whether row is version-level and background color
 */
export function getCellClassName(
	isVersionLevel: boolean,
	bgColor?: 'red' | 'orange' | 'blue' | 'green' | 'yellow' | 'gray'
): string {
	if (isVersionLevel) {
		return 'font-semibold text-foreground'
	}

	const bgClasses: Record<string, string> = {
		red: 'px-2 py-1 text-sm font-normal bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
		orange:
			'px-2 py-1 text-sm font-normal bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
		blue: 'px-2 py-1 text-sm font-normal bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
		green:
			'px-2 py-1 text-sm font-normal bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
		yellow:
			'px-2 py-1 text-sm font-normal bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
		gray: 'px-2 py-1 text-sm font-normal bg-gray-200 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
	}

	return bgColor ? bgClasses[bgColor] : ''
}
