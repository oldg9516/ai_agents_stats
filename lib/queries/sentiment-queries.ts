'use client'

/**
 * React Query hooks for the AI Sentiment Analytics dashboard
 *
 * Each hook wraps one RPC-backed server action. All aggregation happens in the database,
 * so these hooks only cache and hand over the result (spec §8.4).
 */

import { useQuery } from '@tanstack/react-query'
import {
	fetchSentimentAgentQuality,
	fetchSentimentBreakdown,
	fetchSentimentPatterns,
	fetchSentimentTimeseries,
	fetchSentimentTrajectory,
	type SentimentBreakdownDimension,
} from '@/lib/actions/sentiment-actions'
import { QUERY_CACHE_CONFIG } from './query-config'
import { sentimentKeys } from './query-keys'
import type { SentimentGranularity } from '@/constants/sentiment-categories'
import type {
	SentimentAgentQualityRow,
	SentimentBreakdownRow,
	SentimentFilters,
	SentimentPatternRow,
	SentimentTimeseriesBucket,
	SentimentTrajectoryPoint,
} from '@/lib/db/types'

function unwrap<T>(result: { success: true; data: T } | { success: false; error: string }): T {
	if (!result.success) {
		throw new Error(result.error)
	}
	return result.data
}

export function useSentimentTimeseries(filters: SentimentFilters) {
	const { from, to } = filters.dateRange
	return useQuery<SentimentTimeseriesBucket[]>({
		queryKey: sentimentKeys.timeseries(
			from.toISOString(),
			to.toISOString(),
			filters.granularity
		),
		queryFn: async () =>
			unwrap(
				await fetchSentimentTimeseries(
					from,
					to,
					filters.granularity as SentimentGranularity
				)
			),
		...QUERY_CACHE_CONFIG,
	})
}

export function useSentimentBreakdown(
	filters: SentimentFilters,
	dimension: SentimentBreakdownDimension
) {
	const { from, to } = filters.dateRange
	return useQuery<SentimentBreakdownRow[]>({
		queryKey: sentimentKeys.breakdown(from.toISOString(), to.toISOString(), dimension),
		queryFn: async () => unwrap(await fetchSentimentBreakdown(from, to, dimension)),
		...QUERY_CACHE_CONFIG,
	})
}

export function useSentimentTrajectory(filters: SentimentFilters) {
	const { from, to } = filters.dateRange
	return useQuery<SentimentTrajectoryPoint[]>({
		queryKey: sentimentKeys.trajectory(from.toISOString(), to.toISOString()),
		queryFn: async () => unwrap(await fetchSentimentTrajectory(from, to)),
		...QUERY_CACHE_CONFIG,
	})
}

export function useSentimentPatterns(filters: SentimentFilters) {
	const { from, to } = filters.dateRange
	return useQuery<SentimentPatternRow[]>({
		queryKey: sentimentKeys.patterns(from.toISOString(), to.toISOString()),
		queryFn: async () => unwrap(await fetchSentimentPatterns(from, to)),
		...QUERY_CACHE_CONFIG,
	})
}

export function useSentimentAgentQuality(filters: SentimentFilters) {
	const { from, to } = filters.dateRange
	return useQuery<SentimentAgentQualityRow[]>({
		queryKey: sentimentKeys.agentQuality(from.toISOString(), to.toISOString()),
		queryFn: async () => unwrap(await fetchSentimentAgentQuality(from, to)),
		...QUERY_CACHE_CONFIG,
	})
}
