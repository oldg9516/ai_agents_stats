import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import type { DashboardFilters, SupportFilters } from '@/lib/supabase/types'

/**
 * Get default dashboard filter values
 */
export function getDefaultFilters(): DashboardFilters {
	const now = new Date()
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(now.getDate() - 30)

	return {
		dateRange: {
			from: thirtyDaysAgo,
			to: now,
		},
		versions: [], // Empty = all versions
		categories: [], // Empty = all categories
		agents: [...QUALIFIED_AGENTS], // All qualified agents by default
	}
}

/**
 * Get default support filter values
 */
export function getDefaultSupportFilters(): SupportFilters {
	const now = new Date()
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(now.getDate() - 30)

	return {
		dateRange: {
			from: thirtyDaysAgo,
			to: now,
		},
		statuses: [],
		requestTypes: [],
		requirements: [],
		versions: [],
	}
}

/**
 * Parse dashboard filters from Next.js searchParams (Server Component)
 */
export function parseFiltersFromSearchParams(
	searchParams: Record<string, string | string[] | undefined>
): DashboardFilters {
	const defaults = getDefaultFilters()

	// Parse date range
	const from = typeof searchParams.from === 'string' ? searchParams.from : null
	const to = typeof searchParams.to === 'string' ? searchParams.to : null
	const dateRange =
		from && to
			? { from: new Date(from), to: new Date(to) }
			: defaults.dateRange

	// Parse versions
	const versionsParam = searchParams.versions
	const versions =
		typeof versionsParam === 'string'
			? versionsParam.split(',').filter(Boolean)
			: defaults.versions

	// Parse categories
	const categoriesParam = searchParams.categories
	const categories =
		typeof categoriesParam === 'string'
			? categoriesParam.split(',').filter(Boolean)
			: defaults.categories

	// Parse agents
	const agentsParam = searchParams.agents
	const agents =
		typeof agentsParam === 'string'
			? agentsParam.split(',').filter(Boolean)
			: defaults.agents

	return {
		dateRange,
		versions,
		categories,
		agents,
	}
}

/**
 * Parse support filters from Next.js searchParams (Server Component)
 */
export function parseSupportFiltersFromSearchParams(
	searchParams: Record<string, string | string[] | undefined>
): SupportFilters {
	const defaults = getDefaultSupportFilters()

	// Parse date range
	const from = typeof searchParams.from === 'string' ? searchParams.from : null
	const to = typeof searchParams.to === 'string' ? searchParams.to : null
	const dateRange =
		from && to
			? { from: new Date(from), to: new Date(to) }
			: defaults.dateRange

	// Parse statuses
	const statusesParam = searchParams.statuses
	const statuses =
		typeof statusesParam === 'string'
			? statusesParam.split(',').filter(Boolean)
			: defaults.statuses

	// Parse request types
	const requestTypesParam = searchParams.requestTypes
	const requestTypes =
		typeof requestTypesParam === 'string'
			? requestTypesParam.split(',').filter(Boolean)
			: defaults.requestTypes

	// Parse requirements
	const requirementsParam = searchParams.requirements
	const requirements =
		typeof requirementsParam === 'string'
			? requirementsParam.split(',').filter(Boolean)
			: defaults.requirements

	// Parse versions
	const versionsParam = searchParams.versions
	const versions =
		typeof versionsParam === 'string'
			? versionsParam.split(',').filter(Boolean)
			: defaults.versions

	return {
		dateRange,
		statuses,
		requestTypes,
		requirements,
		versions,
	}
}
