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

	// Actions
	setSupportDateRange: (from: Date, to: Date) => void
	setSupportStatuses: (statuses: string[]) => void
	setSupportRequestTypes: (requestTypes: string[]) => void
	setSupportRequirements: (requirements: string[]) => void
	setSupportVersions: (versions: string[]) => void
	resetSupportFilters: () => void
	updateSupportFilters: (filters: Partial<SupportFilters>) => void
}

export const createSupportSlice: StateCreator<
	SupportSlice,
	[],
	[],
	SupportSlice
> = (set) => ({
	// Initial state
	supportFilters: getDefaultSupportFilters(),

	// Actions
	setSupportDateRange: (from, to) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				dateRange: { from, to },
			},
		})),

	setSupportStatuses: (statuses) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				statuses,
			},
		})),

	setSupportRequestTypes: (requestTypes) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				requestTypes,
			},
		})),

	setSupportRequirements: (requirements) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				requirements,
			},
		})),

	setSupportVersions: (versions) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				versions,
			},
		})),

	resetSupportFilters: () =>
		set({
			supportFilters: getDefaultSupportFilters(),
		}),

	updateSupportFilters: (filters) =>
		set((state) => ({
			supportFilters: {
				...state.supportFilters,
				...filters,
			},
		})),
})
