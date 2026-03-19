import type { EvalFilters } from '@/lib/db/queries-eval'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

function getDefaultEvalFilters(): EvalFilters {
	return {
		dateRange: getDefaultDateRange(30),
		categories: [],
	}
}

export interface EvalSlice {
	evalFilters: EvalFilters
	setEvalDateRange: (from: Date, to: Date) => void
	setEvalCategories: (categories: string[]) => void
	resetEvalFilters: () => void
	updateEvalFilters: (filters: Partial<EvalFilters>) => void
}

export const createEvalSlice: StateCreator<
	EvalSlice,
	[],
	[],
	EvalSlice
> = set => {
	const ops = filterSliceActions(set, 'evalFilters', getDefaultEvalFilters)

	return {
		evalFilters: getDefaultEvalFilters(),
		setEvalDateRange: ops.setDateRange,
		setEvalCategories: v => ops.setField('categories', v),
		resetEvalFilters: ops.resetFilters,
		updateEvalFilters: ops.updateFilters,
	}
}
