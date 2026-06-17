'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '..'

export function useSubscriptionFilters() {
	return useStore(
		useShallow(state => ({
			filters: state.subscriptionFilters,
			setDateRange: state.setSubscriptionDateRange,
			setOutcomes: state.setSubscriptionOutcomes,
			setOutstanding: state.setSubscriptionOutstanding,
			setSubtypes: state.setSubscriptionSubtypes,
			resetFilters: state.resetSubscriptionFilters,
			updateFilters: state.updateSubscriptionFilters,
		}))
	)
}
