'use client'

/**
 * Paginated Threads Hook with Incremental Loading & Caching (Variant 3)
 *
 * Features:
 * - Loads 60 records per batch from server
 * - Accumulates all loaded data in single array
 * - Caches each batch separately using React Query
 * - Table shows all loaded data with client-side pagination (20 per page)
 * - Uses Zustand store for pagination state management
 */

import { fetchSupportThreadsAction } from '@/lib/actions/support-actions'
import { useStore } from '@/lib/store'
import type { SupportThread } from '@/lib/supabase/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'

const BATCH_SIZE = 60 // Server fetch size

interface PaginatedThreadsReturn {
	allLoadedThreads: SupportThread[] // All threads loaded so far
	hasMore: boolean // Whether there might be more data on server
	isLoadingInitial: boolean // Loading first batch
	isFetchingMore: boolean // Loading additional batch
	error: Error | null
	loadNextBatch: () => void // Manually load next batch
	totalBatches: number // How many batches loaded
}

/**
 * Generate query key for specific batch
 */
function getBatchQueryKey(
	from: string,
	to: string,
	statuses: string[],
	requestTypes: string[],
	categories: string[],
	requirements: string[],
	versions: string[],
	pendingDraftsOnly: boolean,
	hideRequiresEditing: boolean,
	batchIndex: number
) {
	return [
		'support-threads-batch',
		{
			from,
			to,
			statuses: statuses.sort(),
			requestTypes: requestTypes.sort(),
			categories: categories.sort(),
			requirements: requirements.sort(),
			versions: versions.sort(),
			pendingDraftsOnly,
			hideRequiresEditing,
			batch: batchIndex,
		},
	] as const
}

export function usePaginatedThreads(): PaginatedThreadsReturn {
	const queryClient = useQueryClient()

	// Get state from Zustand store
	const supportFilters = useStore(state => state.supportFilters)
	const currentBatch = useStore(state => state.currentBatch)
	const maxBatchReached = useStore(state => state.maxBatchReached)
	const hasMoreThreads = useStore(state => state.hasMoreThreads)
	const fetchNextBatch = useStore(state => state.fetchNextBatch)
	const setBatchLoaded = useStore(state => state.setBatchLoaded)

	// Fetch current batch
	const {
		data: batchData,
		isLoading,
		error,
		isFetching,
	} = useQuery({
		queryKey: getBatchQueryKey(
			supportFilters.dateRange.from.toISOString(),
			supportFilters.dateRange.to.toISOString(),
			supportFilters.statuses,
			supportFilters.requestTypes,
			supportFilters.categories,
			supportFilters.requirements,
			supportFilters.versions,
			supportFilters.pendingDraftsOnly,
			supportFilters.hideRequiresEditing,
			currentBatch
		),
		queryFn: async () => {
			const offset = currentBatch * BATCH_SIZE
			const result = await fetchSupportThreadsAction(supportFilters, {
				limit: BATCH_SIZE,
				offset,
			})

			if (!result.success || !result.data) {
				throw new Error(result.error || 'Failed to fetch threads')
			}

			return result.data
		},
		staleTime: Infinity, // Keep in cache forever during session
		gcTime: Infinity, // Never garbage collect during session
	})

	// Update hasMore when batch loads
	useEffect(() => {
		if (batchData && batchData.length !== undefined) {
			setBatchLoaded(batchData.length)
		}
	}, [batchData, setBatchLoaded])

	// Collect all loaded batches from React Query cache
	// Include current batch data directly to avoid race conditions
	const allLoadedThreads = useMemo(() => {
		const threads: SupportThread[] = []
		const maxBatch = Math.max(maxBatchReached, currentBatch)

		for (let i = 0; i <= maxBatch; i++) {
			const cachedData = queryClient.getQueryData<SupportThread[]>(
				getBatchQueryKey(
					supportFilters.dateRange.from.toISOString(),
					supportFilters.dateRange.to.toISOString(),
					supportFilters.statuses,
					supportFilters.requestTypes,
					supportFilters.categories,
					supportFilters.requirements,
					supportFilters.versions,
					supportFilters.pendingDraftsOnly,
					supportFilters.hideRequiresEditing,
					i
				)
			)
			if (cachedData) {
				threads.push(...cachedData)
			}
		}

		// If we have batchData but it's not in cache yet, include it
		// This handles the case when data is loading for the first time
		if (batchData && threads.length === 0) {
			threads.push(...batchData)
		}

		return threads
	}, [
		queryClient,
		supportFilters.dateRange.from,
		supportFilters.dateRange.to,
		supportFilters.statuses,
		supportFilters.requestTypes,
		supportFilters.categories,
		supportFilters.requirements,
		supportFilters.versions,
		supportFilters.pendingDraftsOnly,
		supportFilters.hideRequiresEditing,
		maxBatchReached,
		currentBatch,
		batchData, // IMPORTANT: Re-compute when new batch arrives
	])

	// Wrap fetchNextBatch to check hasMore
	const loadNextBatch = useCallback(() => {
		if (hasMoreThreads) {
			fetchNextBatch()
		}
	}, [hasMoreThreads, fetchNextBatch])

	return {
		allLoadedThreads,
		hasMore: hasMoreThreads,
		isLoadingInitial: isLoading && currentBatch === 0,
		isFetchingMore: isFetching && currentBatch > 0,
		error: error as Error | null,
		loadNextBatch,
		totalBatches: maxBatchReached + 1,
	}
}
