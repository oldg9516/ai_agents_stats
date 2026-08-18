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
	AI_AUTO_REPLY_EMAIL,
} from './slices/agents-stats-slice'
import {
	createActionAnalysisSlice,
	ActionAnalysisSlice,
} from './slices/action-analysis-slice'
import {
	createAutomationOverviewSlice,
	AutomationOverviewSlice,
} from './slices/automation-overview-slice'
import {
	createEvalSlice,
	EvalSlice,
} from './slices/eval-slice'
import {
	createRetentionSlice,
	RetentionSlice,
} from './slices/retention-slice'
import {
	createSubscriptionSlice,
	SubscriptionSlice,
} from './slices/subscription-slice'
import {
	createSentimentSlice,
	SentimentSlice,
} from './slices/sentiment-slice'
import {
	validateAndFixDateRange,
	isDateRangeValid,
} from '@/lib/utils/validate-date-range'

/**
 * Global store combining all slices
 */
type StoreState = DashboardSlice & SupportSlice & TicketsReviewSlice & BacklogReportsSlice & AgentsStatsSlice & ActionAnalysisSlice & AutomationOverviewSlice & EvalSlice & RetentionSlice & SubscriptionSlice & SentimentSlice

// Clean up invalid localStorage data on startup
if (typeof window !== 'undefined') {
	const stored = localStorage.getItem('ai-stats-storage')
	if (stored) {
		try {
			const parsed = JSON.parse(stored)
			// Check if version exists, if not - clear old data
			if (!parsed.version || parsed.version < 16) {
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
				...createAutomationOverviewSlice(...a),
				...createEvalSlice(...a),
				...createRetentionSlice(...a),
				...createSubscriptionSlice(...a),
				...createSentimentSlice(...a),
			}),
			{
				name: 'ai-stats-storage',
				version: 18, // 18: add sentiment slice
				partialize: state => ({
					// Persist only filter states
					dashboardFilters: state.dashboardFilters,
					supportFilters: state.supportFilters,
					// Exclude searchQuery from persistence (transient search state)
					ticketsReviewFilters: { ...state.ticketsReviewFilters, searchQuery: '' },
					backlogReportsFilters: state.backlogReportsFilters,
					agentStatsFilters: state.agentStatsFilters,
					actionAnalysisFilters: state.actionAnalysisFilters,
					automationOverviewFilters: state.automationOverviewFilters,
					evalFilters: state.evalFilters,
					retentionFilters: { ...state.retentionFilters, searchQuery: '' },
					subscriptionFilters: { ...state.subscriptionFilters, searchQuery: '' },
					sentimentFilters: state.sentimentFilters,
					isGeneratingReport: state.isGeneratingReport,
					generationStartedAt: state.generationStartedAt,
				}),
				// Migration function for version changes
				migrate: (persistedState: any, version: number) => {
					// Only the two previous versions migrate forward; anything older resets
					if (version !== 16 && version !== 17) {
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
						'automationOverviewFilters',
						'evalFilters',
						'retentionFilters',
						'subscriptionFilters',
						'sentimentFilters',
					]

					for (const key of filterKeys) {
						if (persistedState?.[key]?.dateRange) {
							if (!isDateRangeValid(persistedState[key].dateRange)) {
								return null
							}
						}
					}

					// v17: show the AI auto-reply account without discarding other filters
					const agents = persistedState?.agentStatsFilters?.agents
					if (Array.isArray(agents) && !agents.includes(AI_AUTO_REPLY_EMAIL)) {
						persistedState.agentStatsFilters.agents = [
							...agents,
							AI_AUTO_REPLY_EMAIL,
						]
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
						{ key: 'automationOverviewFilters', defaultDays: 30 },
						{ key: 'evalFilters', defaultDays: 30 },
						{ key: 'retentionFilters', defaultDays: 30 },
						{ key: 'subscriptionFilters', defaultDays: 30 },
						{ key: 'sentimentFilters', defaultDays: 56 },
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
