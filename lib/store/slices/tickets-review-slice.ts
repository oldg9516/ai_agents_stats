import type { TicketsReviewFilters } from '@/lib/supabase/types'
import { StateCreator } from 'zustand'

/**
 * Get default tickets review filter values
 */
function getDefaultTicketsReviewFilters(): TicketsReviewFilters {
	// Default: last 30 days
	const to = new Date()
	to.setHours(23, 59, 59, 999) // End of today

	const from = new Date()
	from.setDate(from.getDate() - 30)
	from.setHours(0, 0, 0, 0) // Start of day 30 days ago

	return {
		dateRange: { from, to },
		categories: [],
		versions: [],
		classifications: [],
		agents: [],
		reviewStatuses: [],
		reviewerNames: [],
	}
}

export interface TicketsReviewSlice {
	// State
	ticketsReviewFilters: TicketsReviewFilters

	// Actions
	setTicketsReviewDateRange: (from: Date, to: Date) => void
	setTicketsReviewCategories: (categories: string[]) => void
	setTicketsReviewVersions: (versions: string[]) => void
	setTicketsReviewClassifications: (classifications: string[]) => void
	setTicketsReviewAgents: (agents: string[]) => void
	setTicketsReviewStatuses: (statuses: string[]) => void
	setTicketsReviewReviewerNames: (reviewerNames: string[]) => void
	resetTicketsReviewFilters: () => void
	updateTicketsReviewFilters: (filters: Partial<TicketsReviewFilters>) => void
}

export const createTicketsReviewSlice: StateCreator<
	TicketsReviewSlice,
	[],
	[],
	TicketsReviewSlice
> = set => ({
	// Initial state
	ticketsReviewFilters: getDefaultTicketsReviewFilters(),

	// Actions
	setTicketsReviewDateRange: (from, to) =>
		set(state => ({
			ticketsReviewFilters: {
				...state.ticketsReviewFilters,
				dateRange: { from, to },
			},
		})),

	setTicketsReviewCategories: categories =>
		set(state => ({
			ticketsReviewFilters: {
				...state.ticketsReviewFilters,
				categories,
			},
		})),

	setTicketsReviewVersions: versions =>
		set(state => ({
			ticketsReviewFilters: {
				...state.ticketsReviewFilters,
				versions,
			},
		})),

	setTicketsReviewClassifications: classifications =>
		set(state => ({
			ticketsReviewFilters: {
				...state.ticketsReviewFilters,
				classifications,
			},
		})),

	setTicketsReviewAgents: agents =>
		set(state => ({
			ticketsReviewFilters: {
				...state.ticketsReviewFilters,
				agents,
			},
		})),

	setTicketsReviewStatuses: reviewStatuses =>
		set(state => ({
			ticketsReviewFilters: {
				...state.ticketsReviewFilters,
				reviewStatuses,
			},
		})),

	setTicketsReviewReviewerNames: reviewerNames =>
		set(state => ({
			ticketsReviewFilters: {
				...state.ticketsReviewFilters,
				reviewerNames,
			},
		})),

	resetTicketsReviewFilters: () =>
		set({
			ticketsReviewFilters: getDefaultTicketsReviewFilters(),
		}),

	updateTicketsReviewFilters: filters =>
		set(state => ({
			ticketsReviewFilters: {
				...state.ticketsReviewFilters,
				...filters,
			},
		})),
})
