import type { SentimentFilters } from '@/lib/db/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'
import type { SentimentGranularity } from '@/constants/sentiment-categories'

/**
 * Sentiment classification only started in mid-June 2026, and the spec frames the
 * dashboard as a weekly monitoring tool, so the default view is 8 weeks by week.
 */
function getDefaultSentimentFilters(): SentimentFilters {
	return {
		dateRange: getDefaultDateRange(56),
		granularity: 'week',
	}
}

export interface SentimentSlice {
	sentimentFilters: SentimentFilters
	setSentimentDateRange: (from: Date, to: Date) => void
	setSentimentGranularity: (granularity: SentimentGranularity) => void
	resetSentimentFilters: () => void
	updateSentimentFilters: (filters: Partial<SentimentFilters>) => void
}

export const createSentimentSlice: StateCreator<
	SentimentSlice,
	[],
	[],
	SentimentSlice
> = set => {
	const ops = filterSliceActions(set, 'sentimentFilters', getDefaultSentimentFilters)

	return {
		sentimentFilters: getDefaultSentimentFilters(),
		setSentimentDateRange: ops.setDateRange,
		setSentimentGranularity: v => ops.setField('granularity', v),
		resetSentimentFilters: ops.resetFilters,
		updateSentimentFilters: ops.updateFilters,
	}
}
