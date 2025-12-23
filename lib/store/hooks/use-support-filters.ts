'use client'

import { useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../index'

/**
 * Hook for managing support filters with Zustand
 *
 * Features:
 * - Global state management via Zustand
 * - localStorage persistence (via Zustand persist middleware)
 * - No URL sync - cleaner URLs
 * - Batch filter updates via applyFilters
 * - Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useSupportFilters() {
	// Use shallow selector to prevent re-renders when other slices change
	const storeValues = useStore(
		useShallow(state => ({
			supportFilters: state.supportFilters,
			setSupportDateRange: state.setSupportDateRange,
			setSupportStatuses: state.setSupportStatuses,
			setSupportRequestTypes: state.setSupportRequestTypes,
			setSupportCategories: state.setSupportCategories,
			setSupportRequirements: state.setSupportRequirements,
			setSupportVersions: state.setSupportVersions,
			setSupportPendingDraftsOnly: state.setSupportPendingDraftsOnly,
			resetSupportFilters: state.resetSupportFilters,
			updateSupportFilters: state.updateSupportFilters,
		}))
	)

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
			storeValues.updateSupportFilters(filters)
		},
		[storeValues.updateSupportFilters]
	)

	return useMemo(
		() => ({
			filters: storeValues.supportFilters,
			setDateRange: storeValues.setSupportDateRange,
			setStatuses: storeValues.setSupportStatuses,
			setRequestTypes: storeValues.setSupportRequestTypes,
			setCategories: storeValues.setSupportCategories,
			setRequirements: storeValues.setSupportRequirements,
			setVersions: storeValues.setSupportVersions,
			setPendingDraftsOnly: storeValues.setSupportPendingDraftsOnly,
			resetFilters: storeValues.resetSupportFilters,
			applyFilters,
		}),
		[storeValues, applyFilters]
	)
}
