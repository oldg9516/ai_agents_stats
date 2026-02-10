'use client'

import { CLIENT_BATCH_SIZE, MAX_CLIENT_RECORDS } from '@/constants/pagination'
import { useState, useCallback, useEffect } from 'react'
import { useTicketsReviewFilters } from '../store/hooks/use-tickets-review-filters'
import { fetchTicketsReviewAction } from '../actions/tickets-review-actions'
import type { TicketReviewRecord } from '../supabase/types'

// Custom event for triggering ticket data refresh from modal
export const TICKETS_REFRESH_EVENT = 'tickets-review-refresh'

// Helper function to dispatch refresh event (call from modal after save)
export function triggerTicketsRefresh() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent(TICKETS_REFRESH_EVENT))
	}
}

/**
 * Hook for paginated tickets review loading
 *
 * Features:
 * - Incremental loading (60 records per batch)
 * - Session storage for caching loaded data
 * - Filters integration (resets cache when filters change)
 * - Loading states for initial load and fetching more
 * - Event-based refresh support for modal updates
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

	const BATCH_SIZE = CLIENT_BATCH_SIZE
	const MAX_RECORDS = MAX_CLIENT_RECORDS

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
		if (!hasMore || isFetchingMore || allLoadedTickets.length >= MAX_RECORDS) return

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
				setHasMore(result.data.length === BATCH_SIZE && newTickets.length < MAX_RECORDS)
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

	// Listen for refresh events from modal
	useEffect(() => {
		const handleRefresh = () => {
			loadInitialBatch()
		}

		window.addEventListener(TICKETS_REFRESH_EVENT, handleRefresh)
		return () => {
			window.removeEventListener(TICKETS_REFRESH_EVENT, handleRefresh)
		}
	}, [loadInitialBatch])

	return {
		allLoadedTickets,
		hasMore,
		isLoadingInitial,
		isFetchingMore,
		loadNextBatch,
	}
}
