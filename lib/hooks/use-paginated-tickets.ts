'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTicketsReviewFilters } from '../store/hooks/use-tickets-review-filters'
import { fetchTicketsReviewAction } from '../actions/tickets-review-actions'
import type { TicketReviewRecord } from '../supabase/types'

/**
 * Hook for paginated tickets review loading
 *
 * Features:
 * - Incremental loading (60 records per batch)
 * - Session storage for caching loaded data
 * - Filters integration (resets cache when filters change)
 * - Loading states for initial load and fetching more
 */
export function usePaginatedTickets() {
	const { filters } = useTicketsReviewFilters()
	const [allLoadedTickets, setAllLoadedTickets] = useState<
		TicketReviewRecord[]
	>([])
	const [hasMore, setHasMore] = useState(true)
	const [isLoadingInitial, setIsLoadingInitial] = useState(true)
	const [isFetchingMore, setIsFetchingMore] = useState(false)
	const [currentOffset, setCurrentOffset] = useState(0)

	const BATCH_SIZE = 60

	// Load initial batch (no caching - data can change frequently)
	const loadInitialBatch = useCallback(async () => {
		setIsLoadingInitial(true)
		try {
			const result = await fetchTicketsReviewAction(filters, {
				limit: BATCH_SIZE,
				offset: 0,
			})

			if (result.success && result.data) {
				setAllLoadedTickets(result.data)
				setCurrentOffset(BATCH_SIZE)
				setHasMore(result.data.length === BATCH_SIZE)
			}
		} catch (error) {
			console.error('Error loading initial tickets batch:', error)
		} finally {
			setIsLoadingInitial(false)
		}
	}, [filters])

	// Load next batch (no caching - data can change frequently)
	const loadNextBatch = useCallback(async () => {
		if (!hasMore || isFetchingMore) return

		setIsFetchingMore(true)
		try {
			const result = await fetchTicketsReviewAction(filters, {
				limit: BATCH_SIZE,
				offset: currentOffset,
			})

			if (result.success && result.data) {
				const newTickets = [...allLoadedTickets, ...result.data]
				setAllLoadedTickets(newTickets)
				setCurrentOffset(prev => prev + BATCH_SIZE)
				setHasMore(result.data.length === BATCH_SIZE)
			}
		} catch (error) {
			console.error('Error loading more tickets:', error)
		} finally {
			setIsFetchingMore(false)
		}
	}, [
		filters,
		currentOffset,
		allLoadedTickets,
		hasMore,
		isFetchingMore,
	])

	// Clear all old ticket caches on mount (migration cleanup)
	useEffect(() => {
		Object.keys(sessionStorage).forEach(key => {
			if (key.startsWith('tickets-review-cache-')) {
				sessionStorage.removeItem(key)
			}
		})
	}, [])

	// Load initial batch on mount or when filters change
	useEffect(() => {
		loadInitialBatch()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]) // Only re-run when filters change

	return {
		allLoadedTickets,
		hasMore,
		isLoadingInitial,
		isFetchingMore,
		loadNextBatch,
	}
}
