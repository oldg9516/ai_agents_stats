import type { TicketsReviewFilters } from '@/lib/supabase/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

function getDefaultTicketsReviewFilters(): TicketsReviewFilters {
	return {
		dateRange: getDefaultDateRange(30),
		ticketId: null,
		categories: [],
		versions: [],
		classifications: [],
		agents: [],
		reviewStatuses: [],
		reviewerNames: [],
	}
}

export interface TicketsReviewSlice {
	ticketsReviewFilters: TicketsReviewFilters
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
> = set => {
	const ops = filterSliceActions(set, 'ticketsReviewFilters', getDefaultTicketsReviewFilters)

	return {
		ticketsReviewFilters: getDefaultTicketsReviewFilters(),
		setTicketsReviewDateRange: ops.setDateRange,
		setTicketsReviewCategories: v => ops.setField('categories', v),
		setTicketsReviewVersions: v => ops.setField('versions', v),
		setTicketsReviewClassifications: v => ops.setField('classifications', v),
		setTicketsReviewAgents: v => ops.setField('agents', v),
		setTicketsReviewStatuses: v => ops.setField('reviewStatuses', v),
		setTicketsReviewReviewerNames: v => ops.setField('reviewerNames', v),
		resetTicketsReviewFilters: ops.resetFilters,
		updateTicketsReviewFilters: ops.updateFilters,
	}
}
