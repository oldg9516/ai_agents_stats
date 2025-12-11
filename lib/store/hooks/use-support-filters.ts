'use client'

import { useStore } from '../index'

/**
 * Hook for managing support filters with Zustand
 *
 * Features:
 * - Global state management via Zustand
 * - localStorage persistence (via Zustand persist middleware)
 * - No URL sync - cleaner URLs
 */
export function useSupportFilters() {
	// Get state and actions from Zustand store
	const {
		supportFilters,
		setSupportDateRange,
		setSupportStatuses,
		setSupportRequestTypes,
		setSupportRequirements,
		setSupportVersions,
		setSupportPendingDraftsOnly,
		resetSupportFilters,
	} = useStore()

	return {
		filters: supportFilters,
		setDateRange: setSupportDateRange,
		setStatuses: setSupportStatuses,
		setRequestTypes: setSupportRequestTypes,
		setRequirements: setSupportRequirements,
		setVersions: setSupportVersions,
		setPendingDraftsOnly: setSupportPendingDraftsOnly,
		resetFilters: resetSupportFilters,
	}
}
