import type { BacklogReportsFilters } from '@/lib/supabase/types'
import { StateCreator } from 'zustand'

/**
 * Get default backlog reports filter values
 */
function getDefaultBacklogReportsFilters(): BacklogReportsFilters {
	const now = new Date()
	now.setHours(23, 59, 59, 999) // End of today

	const ninetyDaysAgo = new Date()
	ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90) // Last 3 months
	ninetyDaysAgo.setHours(0, 0, 0, 0) // Start of day

	return {
		dateRange: {
			from: ninetyDaysAgo,
			to: now,
		},
		periodDays: null, // null = all periods
		minTickets: null,
		searchQuery: '',
	}
}

export interface BacklogReportsSlice {
	// State
	backlogReportsFilters: BacklogReportsFilters
	backlogReportsPage: number
	isGeneratingReport: boolean
	generationStartedAt: string | null // ISO timestamp when generation started

	// Actions
	setBacklogReportsDateRange: (from: Date, to: Date) => void
	setBacklogReportsPeriodDays: (days: number | null) => void
	setBacklogReportsMinTickets: (min: number | null) => void
	setBacklogReportsSearchQuery: (query: string) => void
	setBacklogReportsPage: (page: number) => void
	resetBacklogReportsFilters: () => void
	setIsGeneratingReport: (isGenerating: boolean) => void
	setGenerationStartedAt: (timestamp: string | null) => void
}

export const createBacklogReportsSlice: StateCreator<
	BacklogReportsSlice,
	[],
	[],
	BacklogReportsSlice
> = set => ({
	// Initial state
	backlogReportsFilters: getDefaultBacklogReportsFilters(),
	backlogReportsPage: 0,
	isGeneratingReport: false,
	generationStartedAt: null,

	// Actions
	setBacklogReportsDateRange: (from, to) =>
		set(state => ({
			backlogReportsFilters: {
				...state.backlogReportsFilters,
				dateRange: { from, to },
			},
			backlogReportsPage: 0, // Reset page on filter change
		})),

	setBacklogReportsPeriodDays: days =>
		set(state => ({
			backlogReportsFilters: {
				...state.backlogReportsFilters,
				periodDays: days,
			},
			backlogReportsPage: 0,
		})),

	setBacklogReportsMinTickets: min =>
		set(state => ({
			backlogReportsFilters: {
				...state.backlogReportsFilters,
				minTickets: min,
			},
			backlogReportsPage: 0,
		})),

	setBacklogReportsSearchQuery: query =>
		set(state => ({
			backlogReportsFilters: {
				...state.backlogReportsFilters,
				searchQuery: query,
			},
			backlogReportsPage: 0,
		})),

	setBacklogReportsPage: page => set({ backlogReportsPage: page }),

	resetBacklogReportsFilters: () =>
		set({
			backlogReportsFilters: getDefaultBacklogReportsFilters(),
			backlogReportsPage: 0,
		}),

	setIsGeneratingReport: isGenerating =>
		set({
			isGeneratingReport: isGenerating,
			generationStartedAt: isGenerating ? new Date().toISOString() : null,
		}),

	setGenerationStartedAt: timestamp => set({ generationStartedAt: timestamp }),
})
