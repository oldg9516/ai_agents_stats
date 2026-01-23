/**
 * Date range validation utilities
 * Used for validating persisted date ranges in Zustand stores
 */

export interface DateRange {
	from: Date
	to: Date
}

/**
 * Default date range (last N days)
 */
export function getDefaultDateRange(days: number = 30): DateRange {
	const to = new Date()
	to.setHours(23, 59, 59, 999)
	const from = new Date()
	from.setDate(from.getDate() - days)
	from.setHours(0, 0, 0, 0)
	return { from, to }
}

/**
 * Validate and fix a date range from persisted state
 * Returns fixed DateRange or null if should be reset to default
 */
export function validateAndFixDateRange(
	dateRange: { from: Date | string; to: Date | string } | undefined,
	defaultDays: number = 30
): DateRange {
	if (!dateRange) {
		return getDefaultDateRange(defaultDays)
	}

	const from = new Date(dateRange.from)
	let to = new Date(dateRange.to)
	const now = new Date()
	const today = new Date()
	today.setHours(23, 59, 59, 999)

	// Check if dates are valid
	if (isNaN(from.getTime()) || isNaN(to.getTime())) {
		return getDefaultDateRange(defaultDays)
	}

	// If from date is in the future, reset to defaults
	if (from > now) {
		return getDefaultDateRange(defaultDays)
	}

	// If to date is in the past (stale filter), extend it to today
	// This ensures new records created after the last visit are visible
	if (to < today) {
		to = today
	}

	// If to date is in the future, cap it to today
	if (to > today) {
		to = today
	}

	return { from, to }
}

/**
 * Check if date range is valid for migration
 * Returns true if valid, false if should trigger reset
 */
export function isDateRangeValid(
	dateRange: { from: Date | string; to: Date | string } | undefined
): boolean {
	if (!dateRange) {
		return true // No date range is valid (will use defaults)
	}

	const from = new Date(dateRange.from)
	const now = new Date()

	// If from date is in the future, data is corrupted
	return from <= now
}
