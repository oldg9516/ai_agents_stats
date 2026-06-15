'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '..'

export function useRetentionFilters() {
	return useStore(
		useShallow(state => ({
			filters: state.retentionFilters,
			setDateRange: state.setRetentionDateRange,
			setOutcomes: state.setRetentionOutcomes,
			setOutstanding: state.setRetentionOutstanding,
			setSubtypes: state.setRetentionSubtypes,
			resetFilters: state.resetRetentionFilters,
			updateFilters: state.updateRetentionFilters,
		}))
	)
}
