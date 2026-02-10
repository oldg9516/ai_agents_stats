import type { BacklogReportsFilters } from '@/lib/supabase/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

function getDefaultBacklogReportsFilters(): BacklogReportsFilters {
	return {
		dateRange: getDefaultDateRange(90),
		periodDays: null,
		minTickets: null,
		searchQuery: '',
	}
}

export interface BacklogReportsSlice {
	backlogReportsFilters: BacklogReportsFilters
	backlogReportsPage: number
	isGeneratingReport: boolean
	generationStartedAt: string | null
	setBacklogReportsDateRange: (from: Date, to: Date) => void
	setBacklogReportsPeriodDays: (days: number | null) => void
	setBacklogReportsMinTickets: (min: number | null) => void
	setBacklogReportsSearchQuery: (query: string) => void
	setBacklogReportsPage: (page: number) => void
	resetBacklogReportsFilters: () => void
	setIsGeneratingReport: (isGenerating: boolean) => void
	setGenerationStartedAt: (timestamp: string | null) => void
}

const PAGE_RESET = { backlogReportsPage: 0 }

export const createBacklogReportsSlice: StateCreator<
	BacklogReportsSlice,
	[],
	[],
	BacklogReportsSlice
> = set => {
	const ops = filterSliceActions(set, 'backlogReportsFilters', getDefaultBacklogReportsFilters, PAGE_RESET)

	return {
		backlogReportsFilters: getDefaultBacklogReportsFilters(),
		backlogReportsPage: 0,
		isGeneratingReport: false,
		generationStartedAt: null,

		setBacklogReportsDateRange: ops.setDateRange,
		setBacklogReportsPeriodDays: v => ops.setField('periodDays', v),
		setBacklogReportsMinTickets: v => ops.setField('minTickets', v),
		setBacklogReportsSearchQuery: v => ops.setField('searchQuery', v),
		setBacklogReportsPage: page => set({ backlogReportsPage: page }),
		resetBacklogReportsFilters: ops.resetFilters,

		setIsGeneratingReport: isGenerating =>
			set({
				isGeneratingReport: isGenerating,
				generationStartedAt: isGenerating ? new Date().toISOString() : null,
			}),
		setGenerationStartedAt: timestamp => set({ generationStartedAt: timestamp }),
	}
}
