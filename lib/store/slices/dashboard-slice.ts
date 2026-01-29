import type { CategoryDisplayMode, DashboardFilters, DateFilterMode, ScoringMode } from '@/lib/supabase/types'
import type { ScoreGroup } from '@/constants/classification-types'
import { StateCreator } from 'zustand'

/**
 * Score Group Modal state for viewing tickets by classification
 */
export interface ScoreGroupModalState {
	isOpen: boolean
	category: string | null
	version: string | null
	dates: string | null // Week range or null for version-level
	scoreGroup: ScoreGroup | null
	dateFilterMode: DateFilterMode // Date field to filter by ('created' or 'human_reply')
}

/**
 * Get default score group modal state
 */
function getDefaultScoreGroupModalState(): ScoreGroupModalState {
	return {
		isOpen: false,
		category: null,
		version: null,
		dates: null,
		scoreGroup: null,
		dateFilterMode: 'created',
	}
}

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
		agents: [], // Empty = all agents
	}
}

export interface DashboardSlice {
	// State
	dashboardFilters: DashboardFilters
	scoringMode: ScoringMode // 'legacy' or 'new'
	categoryDisplayMode: CategoryDisplayMode // 'all' or 'merged'
	scoreGroupModal: ScoreGroupModalState // Modal for viewing tickets by score group

	// Actions
	setDashboardDateRange: (from: Date, to: Date) => void
	setDashboardVersions: (versions: string[]) => void
	setDashboardCategories: (categories: string[]) => void
	setDashboardAgents: (agents: string[]) => void
	resetDashboardFilters: () => void
	updateDashboardFilters: (filters: Partial<DashboardFilters>) => void
	setScoringMode: (mode: ScoringMode) => void
	setCategoryDisplayMode: (mode: CategoryDisplayMode) => void
	openScoreGroupModal: (params: Omit<ScoreGroupModalState, 'isOpen'>) => void
	closeScoreGroupModal: () => void
}

export const createDashboardSlice: StateCreator<
	DashboardSlice,
	[],
	[],
	DashboardSlice
> = set => ({
	// Initial state
	dashboardFilters: getDefaultDashboardFilters(),
	scoringMode: 'new', // Default to new scoring mode
	categoryDisplayMode: 'merged', // Default to merged categories
	scoreGroupModal: getDefaultScoreGroupModalState(), // Score group modal state

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

	setDashboardAgents: agents =>
		set(state => ({
			dashboardFilters: {
				...state.dashboardFilters,
				agents,
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

	setCategoryDisplayMode: mode => set({ categoryDisplayMode: mode }),

	openScoreGroupModal: params =>
		set({
			scoreGroupModal: {
				isOpen: true,
				...params,
			},
		}),

	closeScoreGroupModal: () =>
		set({
			scoreGroupModal: getDefaultScoreGroupModalState(),
		}),
})
