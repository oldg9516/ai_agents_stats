import type { TrendData } from '../types'

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
 * Build common filter query for support threads
 */
export function applyCommonFilters<T>(
	query: T,
	filters: {
		statuses?: string[]
		requestTypes?: string[]
		versions?: string[]
		requirements?: string[]
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	methods: { in: (col: string, values: string[]) => T; eq: (col: string, value: boolean) => T }
): T {
	const { statuses = [], requestTypes = [], versions = [], requirements = [] } = filters

	if (statuses.length > 0) {
		query = methods.in('status', statuses)
	}
	if (requestTypes.length > 0) {
		query = methods.in('request_type', requestTypes)
	}
	if (versions.length > 0) {
		query = methods.in('prompt_version', versions)
	}
	if (requirements.length > 0) {
		requirements.forEach(req => {
			query = methods.eq(req, true)
		})
	}

	return query
}
