import { StateCreator } from 'zustand'
import type { SupportFilters } from '@/lib/supabase/types'

/**
 * Get default support filter values
 */
function getDefaultSupportFilters(): SupportFilters {
	// Default: last 30 days
	const to = new Date()
	to.setHours(23, 59, 59, 999) // End of today

	const from = new Date()
	from.setDate(from.getDate() - 30)
	from.setHours(0, 0, 0, 0) // Start of day 30 days ago

	console.log('🔧 Creating default support filters:', {
		from: from.toISOString(),
		to: to.toISOString(),
		fromDate: from.toLocaleDateString(),
		toDate: to.toLocaleDateString(),
	})

	return {
		dateRange: { from, to },
		statuses: [],
		requestTypes: [],
		requirements: [],
		versions: [],
	}
}

export interface SupportSlice {
	// State
	supportFilters: SupportFilters

	// Pagination state
	currentBatch: number
	maxBatchReached: number
	hasMoreThreads: boolean

	// Actions
	setSupportDateRange: (from: Date, to: Date) => void
	setSupportStatuses: (statuses: string[]) => void
	setSupportRequestTypes: (requestTypes: string[]) => void
	setSupportRequirements: (requirements: string[]) => void
	setSupportVersions: (versions: string[]) => void
	resetSupportFilters: () => void
	updateSupportFilters: (filters: Partial<SupportFilters>) => void

	// Pagination actions
	fetchNextBatch: () => void
	setBatchLoaded: (batchSize: number) => void
	resetPagination: () => void
}

export const createSupportSlice: StateCreator<
	SupportSlice,
	[],
	[],
	SupportSlice
> = (set) => ({
	// Initial state
	supportFilters: getDefaultSupportFilters(),

	// Initial pagination state
	currentBatch: 0,
	maxBatchReached: 0,
	hasMoreThreads: true,

	// Actions
	setSupportDateRange: (from, to) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				dateRange: { from, to },
			},
			// Reset pagination when filters change
			currentBatch: 0,
			maxBatchReached: 0,
			hasMoreThreads: true,
		})),

	setSupportStatuses: (statuses) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				statuses,
			},
			// Reset pagination when filters change
			currentBatch: 0,
			maxBatchReached: 0,
			hasMoreThreads: true,
		})),

	setSupportRequestTypes: (requestTypes) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				requestTypes,
			},
			// Reset pagination when filters change
			currentBatch: 0,
			maxBatchReached: 0,
			hasMoreThreads: true,
		})),

	setSupportRequirements: (requirements) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				requirements,
			},
			// Reset pagination when filters change
			currentBatch: 0,
			maxBatchReached: 0,
			hasMoreThreads: true,
		})),

	setSupportVersions: (versions) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				versions,
			},
			// Reset pagination when filters change
			currentBatch: 0,
			maxBatchReached: 0,
			hasMoreThreads: true,
		})),

	resetSupportFilters: () =>
		set({
			supportFilters: getDefaultSupportFilters(),
			// Reset pagination
			currentBatch: 0,
			maxBatchReached: 0,
			hasMoreThreads: true,
		}),

	updateSupportFilters: (filters) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				...filters,
			},
			// Reset pagination when filters change
			currentBatch: 0,
			maxBatchReached: 0,
			hasMoreThreads: true,
		})),

	// Pagination actions
	fetchNextBatch: () =>
		set((state) => ({
			currentBatch: state.currentBatch + 1,
			maxBatchReached: Math.max(state.maxBatchReached, state.currentBatch + 1),
		})),

	setBatchLoaded: (batchSize: number) =>
		set({
			hasMoreThreads: batchSize === 60, // BATCH_SIZE = 60
		}),

	resetPagination: () =>
		set({
			currentBatch: 0,
			maxBatchReached: 0,
			hasMoreThreads: true,
		}),
})
