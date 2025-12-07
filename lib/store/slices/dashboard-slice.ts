import type { DashboardFilters, ScoringMode } from '@/lib/supabase/types'
import { StateCreator } from 'zustand'

/**
 * Get default dashboard filter values
 */
function getDefaultDashboardFilters(): DashboardFilters {
	const now = new Date()
	now.setHours(23, 59, 59, 999) // End of today

	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30) // ✅ Fixed: use thirtyDaysAgo.getDate()
	thirtyDaysAgo.setHours(0, 0, 0, 0) // Start of day

	return {
		dateRange: {
			from: thirtyDaysAgo,
			to: now,
		},
		versions: [], // Empty = all versions
		categories: [], // Empty = all categories
	}
}

export interface DashboardSlice {
	// State
	dashboardFilters: DashboardFilters
	scoringMode: ScoringMode // 'legacy' or 'new'

	// Actions
	setDashboardDateRange: (from: Date, to: Date) => void
	setDashboardVersions: (versions: string[]) => void
	setDashboardCategories: (categories: string[]) => void
	resetDashboardFilters: () => void
	updateDashboardFilters: (filters: Partial<DashboardFilters>) => void
	setScoringMode: (mode: ScoringMode) => void
}

export const createDashboardSlice: StateCreator<
	DashboardSlice,
	[],
	[],
	DashboardSlice
> = set => ({
	// Initial state
	dashboardFilters: getDefaultDashboardFilters(),
	scoringMode: 'legacy', // Default to legacy mode

	// Actions
	setDashboardDateRange: (from, to) =>
		set(state => ({
			dashboardFilters: {
				...state.dashboardFilters,
				dateRange: { from, to },
			},
		})),

	setDashboardVersions: versions =>
		set(state => ({
			dashboardFilters: {
				...state.dashboardFilters,
				versions,
			},
		})),

	setDashboardCategories: categories =>
		set(state => ({
			dashboardFilters: {
				...state.dashboardFilters,
				categories,
			},
		})),

	resetDashboardFilters: () =>
		set({
			dashboardFilters: getDefaultDashboardFilters(),
		}),

	updateDashboardFilters: filters =>
		set(state => ({
			dashboardFilters: {
				...state.dashboardFilters,
				...filters,
			},
		})),

	setScoringMode: mode => set({ scoringMode: mode }),
})
