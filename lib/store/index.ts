/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createDashboardSlice, DashboardSlice } from './slices/dashboard-slice'
import { createSupportSlice, SupportSlice } from './slices/support-slice'
import {
	createTicketsReviewSlice,
	TicketsReviewSlice,
} from './slices/tickets-review-slice'
import {
	createBacklogReportsSlice,
	BacklogReportsSlice,
} from './slices/backlog-reports-slice'
import {
	createAgentsStatsSlice,
	AgentsStatsSlice,
} from './slices/agents-stats-slice'
import {
	createActionAnalysisSlice,
	ActionAnalysisSlice,
} from './slices/action-analysis-slice'
import {
	validateAndFixDateRange,
	isDateRangeValid,
} from '@/lib/utils/validate-date-range'

/**
 * Global store combining all slices
 */
type StoreState = DashboardSlice & SupportSlice & TicketsReviewSlice & BacklogReportsSlice & AgentsStatsSlice & ActionAnalysisSlice

// Clean up invalid localStorage data on startup
if (typeof window !== 'undefined') {
	const stored = localStorage.getItem('ai-stats-storage')
	if (stored) {
		try {
			const parsed = JSON.parse(stored)
			// Check if version exists, if not - clear old data
			if (!parsed.version || parsed.version < 11) {
				localStorage.removeItem('ai-stats-storage')
			}
		} catch {
			// Invalid JSON, clear it
			localStorage.removeItem('ai-stats-storage')
		}
	}
}

export const useStore = create<StoreState>()(
	devtools(
		persist(
			(...a) => ({
				...createDashboardSlice(...a),
				...createSupportSlice(...a),
				...createTicketsReviewSlice(...a),
				...createBacklogReportsSlice(...a),
				...createAgentsStatsSlice(...a),
				...createActionAnalysisSlice(...a),
			}),
			{
				name: 'ai-stats-storage',
				version: 11, // Changed from 10 to 11 to add action analysis slice
				partialize: state => ({
					// Persist only filter states
					dashboardFilters: state.dashboardFilters,
					supportFilters: state.supportFilters,
					// Exclude searchQuery from persistence (transient search state)
					ticketsReviewFilters: { ...state.ticketsReviewFilters, searchQuery: '' },
					backlogReportsFilters: state.backlogReportsFilters,
					agentStatsFilters: state.agentStatsFilters,
					actionAnalysisFilters: state.actionAnalysisFilters,
					isGeneratingReport: state.isGeneratingReport,
					generationStartedAt: state.generationStartedAt,
				}),
				// Migration function for version changes
				migrate: (persistedState: any, version: number) => {
					// Force reset on version change
					if (version !== 11) {
						return null
					}

					// Validate dates in all filter slices
					const filterKeys = [
						'dashboardFilters',
						'supportFilters',
						'ticketsReviewFilters',
						'backlogReportsFilters',
						'agentStatsFilters',
						'actionAnalysisFilters',
					]

					for (const key of filterKeys) {
						if (persistedState?.[key]?.dateRange) {
							if (!isDateRangeValid(persistedState[key].dateRange)) {
								return null
							}
						}
					}

					return persistedState
				},
				// Convert date strings back to Date objects after rehydration
				onRehydrateStorage: () => state => {
					if (!state) {
						return
					}

					// Validate and fix dates for all filter slices
					// Each slice has its own default period
					const sliceConfigs: Array<{
						key: keyof typeof state
						defaultDays: number
					}> = [
						{ key: 'dashboardFilters', defaultDays: 30 },
						{ key: 'supportFilters', defaultDays: 30 },
						{ key: 'ticketsReviewFilters', defaultDays: 30 },
						{ key: 'backlogReportsFilters', defaultDays: 90 },
						{ key: 'agentStatsFilters', defaultDays: 30 },
						{ key: 'actionAnalysisFilters', defaultDays: 30 },
					]

					for (const { key, defaultDays } of sliceConfigs) {
						const filters = state[key] as { dateRange?: { from: Date; to: Date } } | undefined
						if (filters?.dateRange) {
							filters.dateRange = validateAndFixDateRange(
								filters.dateRange,
								defaultDays
							)
						}
					}
				},
			}
		),
		{
			name: 'AI Stats Store',
		}
	)
)
