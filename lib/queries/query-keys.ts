/**
 * Centralized Query Keys
 *
 * All React Query keys should be defined here for consistency
 * and to prevent key collisions
 */

import type { ActionAnalysisFilters, AutomationOverviewFilters, BacklogReportsFilters, DashboardFilters, SupportFilters } from '@/lib/db/types'
import type { EvalFilters } from '@/lib/db/queries-eval'

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
 * Automation Overview query keys
 */
export const automationOverviewKeys = {
	all: ['automation-overview'] as const,
	data: (filters: AutomationOverviewFilters) =>
		[
			...automationOverviewKeys.all,
			{
				from: filters.dateRange.from.toISOString(),
				to: filters.dateRange.to.toISOString(),
				categories: filters.categories.sort(),
				versions: filters.versions.sort(),
			},
		] as const,
}

/**
 * Eval Dashboard query keys
 */
export const evalKeys = {
	all: ['eval'] as const,
	intentTable: (filters: EvalFilters) =>
		[
			...evalKeys.all,
			'intent-table',
			{
				from: filters.dateRange.from.toISOString(),
				to: filters.dateRange.to.toISOString(),
				categories: filters.categories.sort(),
			},
		] as const,
	intentDiagnostics: (filters: EvalFilters, intentId: string) =>
		[
			...evalKeys.all,
			'intent-diagnostics',
			intentId,
			{
				from: filters.dateRange.from.toISOString(),
				to: filters.dateRange.to.toISOString(),
			},
		] as const,
}

/**
 * Backlog Reports query keys
 */
export const backlogReportsKeys = {
	all: ['backlog-reports'] as const,
	list: (filters: BacklogReportsFilters, page: number) =>
		[
			...backlogReportsKeys.all,
			{
				from: filters.dateRange.from.toISOString(),
				to: filters.dateRange.to.toISOString(),
				periodDays: filters.periodDays,
				minTickets: filters.minTickets,
				searchQuery: filters.searchQuery,
				page,
			},
		] as const,
	detail: (reportId: string) => ['backlog-report', reportId] as const,
	latestTimestamp: ['backlog-reports', 'latest-timestamp'] as const,
}

/**
 * Combined query keys object for easy access
 */
export const queryKeys = {
	dashboard: dashboardKeys,
	support: supportKeys,
	actionAnalysis: actionAnalysisKeys,
	automationOverview: automationOverviewKeys,
	eval: evalKeys,
	backlogReports: backlogReportsKeys,
} as const
