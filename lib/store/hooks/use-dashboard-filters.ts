'use client'

import { useStore } from '../index'

/**
 * Hook for managing dashboard filters with Zustand
 *
 * Features:
 * - Global state management via Zustand
 * - localStorage persistence (via Zustand persist middleware)
 * - No URL sync - cleaner URLs
 */
export function useDashboardFilters() {
	// Get state and actions from Zustand store
	const {
		dashboardFilters,
		setDashboardDateRange,
		setDashboardVersions,
		setDashboardCategories,
		setDashboardAgents,
		resetDashboardFilters,
	} = useStore()

	return {
		filters: dashboardFilters,
		setDateRange: setDashboardDateRange,
		setVersions: setDashboardVersions,
		setCategories: setDashboardCategories,
		setAgents: setDashboardAgents,
		resetFilters: resetDashboardFilters,
	}
}
