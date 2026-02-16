import type { ActionAnalysisFilters } from '@/lib/supabase/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

function getDefaultActionAnalysisFilters(): ActionAnalysisFilters {
	return {
		dateRange: getDefaultDateRange(30),
		categories: [],
		versions: [],
	}
}

export interface ActionAnalysisSlice {
	actionAnalysisFilters: ActionAnalysisFilters
	setActionAnalysisDateRange: (from: Date, to: Date) => void
	setActionAnalysisCategories: (categories: string[]) => void
	setActionAnalysisVersions: (versions: string[]) => void
	resetActionAnalysisFilters: () => void
	updateActionAnalysisFilters: (filters: Partial<ActionAnalysisFilters>) => void
}

export const createActionAnalysisSlice: StateCreator<
	ActionAnalysisSlice,
	[],
	[],
	ActionAnalysisSlice
> = set => {
	const ops = filterSliceActions(set, 'actionAnalysisFilters', getDefaultActionAnalysisFilters)

	return {
		actionAnalysisFilters: getDefaultActionAnalysisFilters(),
		setActionAnalysisDateRange: ops.setDateRange,
		setActionAnalysisCategories: v => ops.setField('categories', v),
		setActionAnalysisVersions: v => ops.setField('versions', v),
		resetActionAnalysisFilters: ops.resetFilters,
		updateActionAnalysisFilters: ops.updateFilters,
	}
}
