import type { SupportFilters, TrendData } from '../types'

/**
 * Calculate trend between current and previous values
 */
export function calculateTrend(current: number, previous: number): TrendData {
	if (previous === 0) {
		return {
			value: current,
			percentage: current > 0 ? 100 : 0,
			direction: current > 0 ? 'up' : 'neutral',
		}
	}

	const value = current - previous
	const percentage = (value / previous) * 100

	return {
		value,
		percentage: Math.abs(percentage),
		direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral',
	}
}

/**
 * Build RPC filter parameters from SupportFilters
 * Converts empty arrays to null (SQL functions use NULL = no filter)
 */
export function buildFilterParams(filters: SupportFilters) {
	return {
		p_date_from: filters.dateRange.from.toISOString(),
		p_date_to: filters.dateRange.to.toISOString(),
		p_statuses: filters.statuses?.length ? filters.statuses : null,
		p_request_types: filters.requestTypes?.length ? filters.requestTypes : null,
		p_categories: filters.categories?.length ? filters.categories : null,
		p_requirements: filters.requirements?.length ? filters.requirements : null,
		p_versions: filters.versions?.length ? filters.versions : null,
	}
}

