import type { RetentionFilters } from '@/lib/db/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

function getDefaultRetentionFilters(): RetentionFilters {
	return {
		dateRange: getDefaultDateRange(30),
		searchQuery: '',
		outcomes: [],
		outstanding: 'all',
		subtypes: [],
	}
}

export interface RetentionSlice {
	retentionFilters: RetentionFilters
	setRetentionDateRange: (from: Date, to: Date) => void
	setRetentionOutcomes: (outcomes: RetentionFilters['outcomes']) => void
	setRetentionOutstanding: (v: RetentionFilters['outstanding']) => void
	setRetentionSubtypes: (subtypes: string[]) => void
	resetRetentionFilters: () => void
	updateRetentionFilters: (filters: Partial<RetentionFilters>) => void
}

export const createRetentionSlice: StateCreator<
	RetentionSlice,
	[],
	[],
	RetentionSlice
> = set => {
	const ops = filterSliceActions(set, 'retentionFilters', getDefaultRetentionFilters)

	return {
		retentionFilters: getDefaultRetentionFilters(),
		setRetentionDateRange: ops.setDateRange,
		setRetentionOutcomes: v => ops.setField('outcomes', v),
		setRetentionOutstanding: v => ops.setField('outstanding', v),
		setRetentionSubtypes: v => ops.setField('subtypes', v),
		resetRetentionFilters: ops.resetFilters,
		updateRetentionFilters: ops.updateFilters,
	}
}
