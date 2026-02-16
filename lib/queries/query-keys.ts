/**
 * Centralized Query Keys
 *
 * All React Query keys should be defined here for consistency
 * and to prevent key collisions
 */

import type { ActionAnalysisFilters, DashboardFilters, SupportFilters } from '@/lib/supabase/types'

/**
 * Dashboard query keys
 */
export const dashboardKeys = {
	all: ['dashboard'] as const,
	data: (filters: DashboardFilters) =>
		[
			...dashboardKeys.all,
			{
				from: filters.dateRange.from.toISOString(),
				to: filters.dateRange.to.toISOString(),
				versions: filters.versions.sort(),
				categories: filters.categories.sort(),
				agents: (filters.agents ?? []).sort(),
			},
		] as const,
	detailedStats: (
		filters: DashboardFilters,
		page: number,
		pageSize: number,
		categoryDisplayMode: string
	) =>
		[
			'detailed-stats-paginated',
			{
				from: filters.dateRange.from.toISOString(),
				to: filters.dateRange.to.toISOString(),
				versions: filters.versions.sort(),
				categories: filters.categories.sort(),
				agents: (filters.agents ?? []).sort(),
				page,
				pageSize,
				categoryDisplayMode,
			},
		] as const,
	filterOptions: ['dashboard-filter-options'] as const,
}

/**
 * Support query keys
 */
export const supportKeys = {
	all: ['support'] as const,
	data: (filters: SupportFilters) =>
		[
			...supportKeys.all,
			{
				from: filters.dateRange.from.toISOString(),
				to: filters.dateRange.to.toISOString(),
				statuses: filters.statuses.sort(),
				requestTypes: filters.requestTypes.sort(),
				categories: filters.categories.sort(),
				requirements: filters.requirements.sort(),
				versions: filters.versions.sort(),
				pendingDraftsOnly: filters.pendingDraftsOnly,
			},
		] as const,
	categoryStats: (dateRange: { from: Date; to: Date }) =>
		[
			'request-category-stats',
			{
				from: dateRange.from.toISOString(),
				to: dateRange.to.toISOString(),
			},
		] as const,
	availableCategories: (dateRange: { from: Date; to: Date }) =>
		[
			'available-categories',
			{
				from: dateRange.from.toISOString(),
				to: dateRange.to.toISOString(),
			},
		] as const,
}

/**
 * Action Analysis query keys
 */
export const actionAnalysisKeys = {
	all: ['action-analysis'] as const,
	data: (filters: ActionAnalysisFilters) =>
		[
			...actionAnalysisKeys.all,
			{
				from: filters.dateRange.from.toISOString(),
				to: filters.dateRange.to.toISOString(),
				categories: filters.categories.sort(),
				versions: filters.versions.sort(),
			},
		] as const,
}

/**
 * Combined query keys object for easy access
 */
export const queryKeys = {
	dashboard: dashboardKeys,
	support: supportKeys,
	actionAnalysis: actionAnalysisKeys,
} as const
