'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '..'

/**
 * Hook for accessing automation overview filters state
 *
 * Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useAutomationOverviewFilters() {
	return useStore(
		useShallow(state => ({
			filters: state.automationOverviewFilters,
			setDateRange: state.setAutomationOverviewDateRange,
			setCategories: state.setAutomationOverviewCategories,
			setVersions: state.setAutomationOverviewVersions,
			resetFilters: state.resetAutomationOverviewFilters,
			updateFilters: state.updateAutomationOverviewFilters,
		}))
	)
}
