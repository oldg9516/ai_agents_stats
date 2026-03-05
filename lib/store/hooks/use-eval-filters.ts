'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '..'

/**
 * Hook for accessing eval dashboard filters state
 *
 * Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useEvalFilters() {
	return useStore(
		useShallow(state => ({
			filters: state.evalFilters,
			setDateRange: state.setEvalDateRange,
			setCategories: state.setEvalCategories,
			resetFilters: state.resetEvalFilters,
			updateFilters: state.updateEvalFilters,
		}))
	)
}
