import { StateCreator } from 'zustand'
import type { DashboardFilters } from '@/lib/supabase/types'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'

/**
 * Get default dashboard filter values
 */
function getDefaultDashboardFilters(): DashboardFilters {
	const now = new Date()
	now.setHours(23, 59, 59, 999) // End of today

	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30) // ✅ Fixed: use thirtyDaysAgo.getDate()
	thirtyDaysAgo.setHours(0, 0, 0, 0) // Start of day

	console.log('🔧 Dashboard default filters:', {
		from: thirtyDaysAgo.toISOString(),
		to: now.toISOString(),
	})

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

export interface DashboardSlice {
	// State
	dashboardFilters: DashboardFilters

	// Actions
	setDashboardDateRange: (from: Date, to: Date) => void
	setDashboardVersions: (versions: string[]) => void
	setDashboardCategories: (categories: string[]) => void
	setDashboardAgents: (agents: string[]) => void
	resetDashboardFilters: () => void
	updateDashboardFilters: (filters: Partial<DashboardFilters>) => void
}

export const createDashboardSlice: StateCreator<
	DashboardSlice,
	[],
	[],
	DashboardSlice
> = (set) => ({
	// Initial state
	dashboardFilters: getDefaultDashboardFilters(),

	// Actions
	setDashboardDateRange: (from, to) =>
		set((state) => ({
			dashboardFilters: {
				...state.dashboardFilters,
				dateRange: { from, to },
			},
		})),

	setDashboardVersions: (versions) =>
		set((state) => ({
			dashboardFilters: {
				...state.dashboardFilters,
				versions,
			},
		})),

	setDashboardCategories: (categories) =>
		set((state) => ({
			dashboardFilters: {
				...state.dashboardFilters,
				categories,
			},
		})),

	setDashboardAgents: (agents) =>
		set((state) => ({
			dashboardFilters: {
				...state.dashboardFilters,
				agents, // Allow empty array to show ALL agents from database
			},
		})),

	resetDashboardFilters: () =>
		set({
			dashboardFilters: getDefaultDashboardFilters(),
		}),

	updateDashboardFilters: (filters) =>
		set((state) => ({
			dashboardFilters: {
				...state.dashboardFilters,
				...filters,
			},
		})),
})
