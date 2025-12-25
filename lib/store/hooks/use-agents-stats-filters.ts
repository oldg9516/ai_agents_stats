'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../index'

/**
 * Hook for managing agent stats filters with Zustand
 *
 * Features:
 * - Global state management via Zustand
 * - localStorage persistence (via Zustand persist middleware)
 * - Modal state for viewing agent changes
 * - Optimized with shallow comparison to prevent unnecessary re-renders
 */
export function useAgentsStatsFilters() {
	// Use shallow selector to prevent re-renders when other slices change
	return useStore(
		useShallow(state => ({
			// Filters
			filters: state.agentStatsFilters,
			setDateRange: state.setAgentStatsDateRange,
			setVersions: state.setAgentStatsVersions,
			setCategories: state.setAgentStatsCategories,
			resetFilters: state.resetAgentStatsFilters,
			updateFilters: state.updateAgentStatsFilters,
			// Modal
			agentChangesModal: state.agentChangesModal,
			openAgentChangesModal: state.openAgentChangesModal,
			closeAgentChangesModal: state.closeAgentChangesModal,
			setAgentChangesType: state.setAgentChangesType,
		}))
	)
}
