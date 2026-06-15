'use client'

import { CLIENT_BATCH_SIZE, MAX_CLIENT_RECORDS } from '@/constants/pagination'
import { useState, useCallback, useEffect } from 'react'
import { useRetentionFilters } from '../store/hooks/use-retention-filters'
import { fetchRetentionListAction } from '../actions/retention-actions'
import type { RetentionListItem } from '@/lib/db/types'

// Custom event for modal-to-table refresh (after a comment is saved)
export const RETENTION_REFRESH_EVENT = 'retention-refresh'

export function triggerRetentionRefresh() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent(RETENTION_REFRESH_EVENT))
	}
}

export function usePaginatedRetention() {
	const { filters } = useRetentionFilters()
	const [items, setItems] = useState<RetentionListItem[]>([])
	const [hasMore, setHasMore] = useState(true)
	const [isLoadingInitial, setIsLoadingInitial] = useState(true)
	const [isFetchingMore, setIsFetchingMore] = useState(false)
	const [currentOffset, setCurrentOffset] = useState(0)

	const BATCH = CLIENT_BATCH_SIZE
	const MAX = MAX_CLIENT_RECORDS

	const loadInitial = useCallback(async () => {
		setIsLoadingInitial(true)
		try {
			const res = await fetchRetentionListAction(filters, { limit: BATCH, offset: 0 })
			if (res.success && res.data) {
				setItems(res.data)
				setCurrentOffset(BATCH)
				setHasMore(res.data.length === BATCH)
			}
		} catch (e) {
			console.error('Error loading retention list:', e)
		} finally {
			setIsLoadingInitial(false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters])

	const loadNextBatch = useCallback(async () => {
		if (!hasMore || isFetchingMore || items.length >= MAX) return
		setIsFetchingMore(true)
		try {
			const res = await fetchRetentionListAction(filters, {
				limit: BATCH,
				offset: currentOffset,
			})
			if (res.success && res.data) {
				const merged = [...items, ...res.data]
				setItems(merged)
				setCurrentOffset(prev => prev + BATCH)
				setHasMore(res.data.length === BATCH && merged.length < MAX)
			}
		} catch (e) {
			console.error('Error loading more retention:', e)
		} finally {
			setIsFetchingMore(false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters, currentOffset, items, hasMore, isFetchingMore])

	useEffect(() => {
		loadInitial()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters])

	useEffect(() => {
		const handle = () => loadInitial()
		window.addEventListener(RETENTION_REFRESH_EVENT, handle)
		return () => window.removeEventListener(RETENTION_REFRESH_EVENT, handle)
	}, [loadInitial])

	return { items, hasMore, isLoadingInitial, isFetchingMore, loadNextBatch }
}
