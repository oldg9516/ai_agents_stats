'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '..'

/**
 * Hook for accessing action analysis filters state
 *
 * Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useActionAnalysisFilters() {
	return useStore(
		useShallow(state => ({
			filters: state.actionAnalysisFilters,
			setDateRange: state.setActionAnalysisDateRange,
			setCategories: state.setActionAnalysisCategories,
			setVersions: state.setActionAnalysisVersions,
			resetFilters: state.resetActionAnalysisFilters,
			updateFilters: state.updateActionAnalysisFilters,
		}))
	)
}
