'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '..'

/**
 * Hook for accessing backlog reports filters state
 *
 * Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useBacklogReportsFilters() {
	// Use single shallow selector to prevent re-renders when other slices change
	return useStore(
		useShallow(state => ({
			filters: state.backlogReportsFilters,
			page: state.backlogReportsPage,
			isGeneratingReport: state.isGeneratingReport,
			generationStartedAt: state.generationStartedAt,
			setDateRange: state.setBacklogReportsDateRange,
			setPeriodDays: state.setBacklogReportsPeriodDays,
			setMinTickets: state.setBacklogReportsMinTickets,
			setSearchQuery: state.setBacklogReportsSearchQuery,
			setPage: state.setBacklogReportsPage,
			resetFilters: state.resetBacklogReportsFilters,
			setIsGeneratingReport: state.setIsGeneratingReport,
			setGenerationStartedAt: state.setGenerationStartedAt,
		}))
	)
}
