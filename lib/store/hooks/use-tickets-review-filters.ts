'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '..'

/**
 * Hook for accessing tickets review filters state
 *
 * Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useTicketsReviewFilters() {
	// Use single shallow selector to prevent re-renders when other slices change
	return useStore(
		useShallow(state => ({
			filters: state.ticketsReviewFilters,
			setDateRange: state.setTicketsReviewDateRange,
			setCategories: state.setTicketsReviewCategories,
			setVersions: state.setTicketsReviewVersions,
			setClassifications: state.setTicketsReviewClassifications,
			setAgents: state.setTicketsReviewAgents,
			setStatuses: state.setTicketsReviewStatuses,
			setReviewerNames: state.setTicketsReviewReviewerNames,
			resetFilters: state.resetTicketsReviewFilters,
			updateFilters: state.updateTicketsReviewFilters,
		}))
	)
}
