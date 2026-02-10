import type { CategoryDisplayMode, DashboardFilters, DateFilterMode, ScoringMode } from '@/lib/supabase/types'
import type { ScoreGroup } from '@/constants/classification-types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

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

function getDefaultDashboardFilters(): DashboardFilters {
	return {
		dateRange: getDefaultDateRange(30),
		versions: [],
		categories: [],
		agents: [],
		hideRequiresEditing: false, // DEPRECATED
		showNeedEdit: true,
		showNotNeedEdit: true,
	}
}

export interface DashboardSlice {
	dashboardFilters: DashboardFilters
	scoringMode: ScoringMode
	categoryDisplayMode: CategoryDisplayMode
	scoreGroupModal: ScoreGroupModalState
	setDashboardDateRange: (from: Date, to: Date) => void
	setDashboardVersions: (versions: string[]) => void
	setDashboardCategories: (categories: string[]) => void
	setDashboardAgents: (agents: string[]) => void
	setDashboardHideRequiresEditing: (enabled: boolean) => void
	setDashboardShowNeedEdit: (enabled: boolean) => void
	setDashboardShowNotNeedEdit: (enabled: boolean) => void
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
> = set => {
	const ops = filterSliceActions(set, 'dashboardFilters', getDefaultDashboardFilters)

	return {
		dashboardFilters: getDefaultDashboardFilters(),
		scoringMode: 'new',
		categoryDisplayMode: 'merged',
		scoreGroupModal: getDefaultScoreGroupModalState(),

		setDashboardDateRange: ops.setDateRange,
		setDashboardVersions: v => ops.setField('versions', v),
		setDashboardCategories: v => ops.setField('categories', v),
		setDashboardAgents: v => ops.setField('agents', v),
		setDashboardHideRequiresEditing: v => ops.setField('hideRequiresEditing', v),
		setDashboardShowNeedEdit: v => ops.setField('showNeedEdit', v),
		setDashboardShowNotNeedEdit: v => ops.setField('showNotNeedEdit', v),
		resetDashboardFilters: ops.resetFilters,
		updateDashboardFilters: ops.updateFilters,

		setScoringMode: mode => set({ scoringMode: mode }),
		setCategoryDisplayMode: mode => set({ categoryDisplayMode: mode }),
		openScoreGroupModal: params => set({ scoreGroupModal: { isOpen: true, ...params } }),
		closeScoreGroupModal: () => set({ scoreGroupModal: getDefaultScoreGroupModalState() }),
	}
}
