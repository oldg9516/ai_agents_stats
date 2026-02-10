'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../index'

/**
 * Hook for managing support filters with Zustand.
 * Simplified: returns updateFilters directly instead of wrapping in useCallback/useMemo.
 */
export function useSupportFilters() {
	return useStore(
		useShallow(state => ({
			filters: state.supportFilters,
			setDateRange: state.setSupportDateRange,
			resetFilters: state.resetSupportFilters,
			updateFilters: state.updateSupportFilters,
		}))
	)
}
