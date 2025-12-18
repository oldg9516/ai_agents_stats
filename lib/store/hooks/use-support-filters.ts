'use client'

import { useCallback } from 'react'
import { useStore } from '../index'

/**
 * Hook for managing support filters with Zustand
 *
 * Features:
 * - Global state management via Zustand
 * - localStorage persistence (via Zustand persist middleware)
 * - No URL sync - cleaner URLs
 * - Batch filter updates via applyFilters
 */
export function useSupportFilters() {
	// Get state and actions from Zustand store
	const {
		supportFilters,
		setSupportDateRange,
		setSupportStatuses,
		setSupportRequestTypes,
		setSupportCategories,
		setSupportRequirements,
		setSupportVersions,
		setSupportPendingDraftsOnly,
		resetSupportFilters,
		updateSupportFilters,
	} = useStore()

	// Apply multiple filters at once (used by SupportFilterBar with Apply button)
	const applyFilters = useCallback(
		(filters: {
			statuses: string[]
			requestTypes: string[]
			categories: string[]
			requirements: string[]
			versions: string[]
			pendingDraftsOnly: boolean
		}) => {
			updateSupportFilters(filters)
		},
		[updateSupportFilters]
	)

	return {
		filters: supportFilters,
		setDateRange: setSupportDateRange,
		setStatuses: setSupportStatuses,
		setRequestTypes: setSupportRequestTypes,
		setCategories: setSupportCategories,
		setRequirements: setSupportRequirements,
		setVersions: setSupportVersions,
		setPendingDraftsOnly: setSupportPendingDraftsOnly,
		resetFilters: resetSupportFilters,
		applyFilters,
	}
}
