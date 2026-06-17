import type { RetentionFilters } from '@/lib/db/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

// Subscription support board reuses the retention filter shape.
function getDefaultSubscriptionFilters(): RetentionFilters {
	return {
		dateRange: getDefaultDateRange(30),
		searchQuery: '',
		outcomes: [],
		outstanding: 'all',
		subtypes: [],
	}
}

export interface SubscriptionSlice {
	subscriptionFilters: RetentionFilters
	setSubscriptionDateRange: (from: Date, to: Date) => void
	setSubscriptionOutcomes: (outcomes: RetentionFilters['outcomes']) => void
	setSubscriptionOutstanding: (v: RetentionFilters['outstanding']) => void
	setSubscriptionSubtypes: (subtypes: string[]) => void
	resetSubscriptionFilters: () => void
	updateSubscriptionFilters: (filters: Partial<RetentionFilters>) => void
}

export const createSubscriptionSlice: StateCreator<
	SubscriptionSlice,
	[],
	[],
	SubscriptionSlice
> = set => {
	const ops = filterSliceActions(
		set,
		'subscriptionFilters',
		getDefaultSubscriptionFilters,
	)

	return {
		subscriptionFilters: getDefaultSubscriptionFilters(),
		setSubscriptionDateRange: ops.setDateRange,
		setSubscriptionOutcomes: v => ops.setField('outcomes', v),
		setSubscriptionOutstanding: v => ops.setField('outstanding', v),
		setSubscriptionSubtypes: v => ops.setField('subtypes', v),
		resetSubscriptionFilters: ops.resetFilters,
		updateSubscriptionFilters: ops.updateFilters,
	}
}
