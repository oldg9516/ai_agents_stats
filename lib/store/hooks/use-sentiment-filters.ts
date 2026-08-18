'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '..'

/**
 * Hook for accessing sentiment dashboard filters
 *
 * Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useSentimentFilters() {
	return useStore(
		useShallow(state => ({
			filters: state.sentimentFilters,
			setDateRange: state.setSentimentDateRange,
			setGranularity: state.setSentimentGranularity,
			resetFilters: state.resetSentimentFilters,
			updateFilters: state.updateSentimentFilters,
		}))
	)
}
