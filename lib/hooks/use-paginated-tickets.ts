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

	// Generate cache key based on filters
	// v2: Added change_classification IS NOT NULL filter
	const getCacheKey = useCallback(() => {
		return `tickets-review-cache-v2-${JSON.stringify(filters)}`
	}, [filters])

	// Load initial batch or from cache
	const loadInitialBatch = useCallback(async () => {
		const cacheKey = getCacheKey()
		const cached = sessionStorage.getItem(cacheKey)

		if (cached) {
			try {
				const { tickets, offset, batchSize } = JSON.parse(cached)
				// Validate cache: only use if batch size matches current BATCH_SIZE
				if (batchSize === BATCH_SIZE) {
					setAllLoadedTickets(tickets)
					setCurrentOffset(offset)
					// Check if we can load more based on last batch size
					const lastBatchSize = tickets.length % BATCH_SIZE
					setHasMore(lastBatchSize === 0 && tickets.length > 0)
					setIsLoadingInitial(false)
					return
				} else {
					// Batch size changed, invalidate cache
					sessionStorage.removeItem(cacheKey)
				}
			} catch (e) {
				// Invalid cache, proceed with fetch
				sessionStorage.removeItem(cacheKey)
			}
		}

		// Fetch first batch
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

				// Cache the result with batch size
				sessionStorage.setItem(
					cacheKey,
					JSON.stringify({
						tickets: result.data,
						offset: BATCH_SIZE,
						batchSize: BATCH_SIZE,
					})
				)
			}
		} catch (error) {
			console.error('Error loading initial tickets batch:', error)
		} finally {
			setIsLoadingInitial(false)
		}
	}, [filters, getCacheKey])

	// Load next batch
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

				// Update cache with batch size (with error handling for quota exceeded)
				const cacheKey = getCacheKey()
				try {
					sessionStorage.setItem(
						cacheKey,
						JSON.stringify({
							tickets: newTickets,
							offset: currentOffset + BATCH_SIZE,
							batchSize: BATCH_SIZE,
						})
					)
				} catch (e) {
					// If quota exceeded, clear old caches and try again
					if (e instanceof DOMException && e.name === 'QuotaExceededError') {
						console.warn('SessionStorage quota exceeded, clearing old caches')
						// Clear all ticket caches
						Object.keys(sessionStorage).forEach(key => {
							if (key.startsWith('tickets-review-cache-')) {
								sessionStorage.removeItem(key)
							}
						})
						// Try one more time with empty storage
						try {
							sessionStorage.setItem(
								cacheKey,
								JSON.stringify({
									tickets: newTickets,
									offset: currentOffset + BATCH_SIZE,
									batchSize: BATCH_SIZE,
								})
							)
						} catch (retryError) {
							console.error('Failed to cache tickets even after clearing:', retryError)
						}
					}
				}
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
		getCacheKey,
	])

	// Clear old v1 caches on mount
	useEffect(() => {
		// Clear old version caches (without v2 prefix)
		Object.keys(sessionStorage).forEach(key => {
			if (key.startsWith('tickets-review-cache-') && !key.startsWith('tickets-review-cache-v2-')) {
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
