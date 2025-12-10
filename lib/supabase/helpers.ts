import type { TrendData } from './types'

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
