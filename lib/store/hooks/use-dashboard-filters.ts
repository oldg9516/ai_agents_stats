'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../index'

/**
 * Hook for managing dashboard filters with Zustand
 *
 * Features:
 * - Global state management via Zustand
 * - localStorage persistence (via Zustand persist middleware)
 * - No URL sync - cleaner URLs
 * - Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useDashboardFilters() {
	// Use shallow selector to prevent re-renders when other slices change
	return useStore(
		useShallow(state => ({
			filters: state.dashboardFilters,
			setDateRange: state.setDashboardDateRange,
			setVersions: state.setDashboardVersions,
			setCategories: state.setDashboardCategories,
			setAgents: state.setDashboardAgents,
			resetFilters: state.resetDashboardFilters,
			scoringMode: state.scoringMode,
			setScoringMode: state.setScoringMode,
			categoryDisplayMode: state.categoryDisplayMode,
			setCategoryDisplayMode: state.setCategoryDisplayMode,
			scoreGroupModal: state.scoreGroupModal,
			openScoreGroupModal: state.openScoreGroupModal,
			closeScoreGroupModal: state.closeScoreGroupModal,
		}))
	)
}
