'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../index'

/**
 * Hook for managing dashboard filters with Zustand.
 * Only returns filter-related state. For display settings, use useDashboardDisplayMode.
 * For score group modal, use useScoreGroupModal.
 */
export function useDashboardFilters() {
	return useStore(
		useShallow(state => ({
			filters: state.dashboardFilters,
			setDateRange: state.setDashboardDateRange,
			setVersions: state.setDashboardVersions,
			setCategories: state.setDashboardCategories,
			setAgents: state.setDashboardAgents,
			setHideRequiresEditing: state.setDashboardHideRequiresEditing,
			setShowNeedEdit: state.setDashboardShowNeedEdit,
			setShowNotNeedEdit: state.setDashboardShowNotNeedEdit,
			resetFilters: state.resetDashboardFilters,
			updateFilters: state.updateDashboardFilters,
		}))
	)
}

/**
 * Hook for dashboard display mode settings (scoring mode, category display).
 * Separated from filters to avoid unnecessary re-renders.
 */
export function useDashboardDisplayMode() {
	return useStore(
		useShallow(state => ({
			scoringMode: state.scoringMode,
			setScoringMode: state.setScoringMode,
			categoryDisplayMode: state.categoryDisplayMode,
			setCategoryDisplayMode: state.setCategoryDisplayMode,
		}))
	)
}

/**
 * Hook for score group modal state.
 * Separated from filters to avoid unnecessary re-renders.
 */
export function useScoreGroupModal() {
	return useStore(
		useShallow(state => ({
			scoreGroupModal: state.scoreGroupModal,
			openScoreGroupModal: state.openScoreGroupModal,
			closeScoreGroupModal: state.closeScoreGroupModal,
		}))
	)
}
