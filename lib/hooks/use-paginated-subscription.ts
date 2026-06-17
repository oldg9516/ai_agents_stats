'use client'

import { CLIENT_BATCH_SIZE, MAX_CLIENT_RECORDS } from '@/constants/pagination'
import { useState, useCallback, useEffect } from 'react'
import { useSubscriptionFilters } from '../store/hooks/use-subscription-filters'
import { fetchRetentionListAction } from '../actions/retention-actions'
import type { RetentionListItem } from '@/lib/db/types'

export const SUBSCRIPTION_REFRESH_EVENT = 'subscription-refresh'

export function triggerSubscriptionRefresh() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REFRESH_EVENT))
	}
}

export function usePaginatedSubscription() {
	const { filters } = useSubscriptionFilters()
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
			const res = await fetchRetentionListAction(
				filters,
				{ limit: BATCH, offset: 0 },
				'subscription',
			)
			if (res.success && res.data) {
				setItems(res.data)
				setCurrentOffset(BATCH)
				setHasMore(res.data.length === BATCH)
			}
		} catch (e) {
			console.error('Error loading subscription list:', e)
		} finally {
			setIsLoadingInitial(false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters])

	const loadNextBatch = useCallback(async () => {
		if (!hasMore || isFetchingMore || items.length >= MAX) return
		setIsFetchingMore(true)
		try {
			const res = await fetchRetentionListAction(
				filters,
				{ limit: BATCH, offset: currentOffset },
				'subscription',
			)
			if (res.success && res.data) {
				const merged = [...items, ...res.data]
				setItems(merged)
				setCurrentOffset(prev => prev + BATCH)
				setHasMore(res.data.length === BATCH && merged.length < MAX)
			}
		} catch (e) {
			console.error('Error loading more subscription:', e)
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
		window.addEventListener(SUBSCRIPTION_REFRESH_EVENT, handle)
		return () => window.removeEventListener(SUBSCRIPTION_REFRESH_EVENT, handle)
	}, [loadInitial])

	return { items, hasMore, isLoadingInitial, isFetchingMore, loadNextBatch }
}
