import { CLIENT_BATCH_SIZE } from '@/constants/pagination'
import type { SupportFilters } from '@/lib/supabase/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

function getDefaultSupportFilters(): SupportFilters {
	return {
		dateRange: getDefaultDateRange(30),
		statuses: [],
		requestTypes: [],
		categories: [],
		requirements: [],
		versions: [],
		pendingDraftsOnly: false,
		hideRequiresEditing: false,
	}
}

const PAGINATION_RESET = {
	currentBatch: 0,
	maxBatchReached: 0,
	hasMoreThreads: true,
}

export interface SupportSlice {
	supportFilters: SupportFilters
	currentBatch: number
	maxBatchReached: number
	hasMoreThreads: boolean
	setSupportDateRange: (from: Date, to: Date) => void
	setSupportStatuses: (statuses: string[]) => void
	setSupportRequestTypes: (requestTypes: string[]) => void
	setSupportCategories: (categories: string[]) => void
	setSupportRequirements: (requirements: string[]) => void
	setSupportVersions: (versions: string[]) => void
	setSupportPendingDraftsOnly: (enabled: boolean) => void
	setSupportHideRequiresEditing: (enabled: boolean) => void
	resetSupportFilters: () => void
	updateSupportFilters: (filters: Partial<SupportFilters>) => void
	fetchNextBatch: () => void
	setBatchLoaded: (batchSize: number) => void
	resetPagination: () => void
}

export const createSupportSlice: StateCreator<
	SupportSlice,
	[],
	[],
	SupportSlice
> = set => {
	const ops = filterSliceActions(set, 'supportFilters', getDefaultSupportFilters, PAGINATION_RESET)

	return {
		supportFilters: getDefaultSupportFilters(),
		...PAGINATION_RESET,

		setSupportDateRange: ops.setDateRange,
		setSupportStatuses: v => ops.setField('statuses', v),
		setSupportRequestTypes: v => ops.setField('requestTypes', v),
		setSupportCategories: v => ops.setField('categories', v),
		setSupportRequirements: v => ops.setField('requirements', v),
		setSupportVersions: v => ops.setField('versions', v),
		setSupportPendingDraftsOnly: v => ops.setField('pendingDraftsOnly', v),
		setSupportHideRequiresEditing: v => ops.setField('hideRequiresEditing', v),
		resetSupportFilters: ops.resetFilters,
		updateSupportFilters: ops.updateFilters,

		fetchNextBatch: () =>
			set(state => ({
				currentBatch: state.currentBatch + 1,
				maxBatchReached: Math.max(state.maxBatchReached, state.currentBatch + 1),
			})),
		setBatchLoaded: (batchSize: number) =>
			set({ hasMoreThreads: batchSize === CLIENT_BATCH_SIZE }),
		resetPagination: () =>
			set(PAGINATION_RESET),
	}
}
