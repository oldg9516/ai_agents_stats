import type {
	AgentStatsFilters,
	AgentChangeType,
	AgentChangesModalState,
} from '@/lib/supabase/types'
import { StateCreator } from 'zustand'

/**
 * Get default agent changes modal state
 */
function getDefaultAgentChangesModalState(): AgentChangesModalState {
	return {
		isOpen: false,
		agentEmail: null,
		changeType: 'all',
	}
}

/**
 * Get default agent stats filter values
 */
function getDefaultAgentStatsFilters(): AgentStatsFilters {
	const now = new Date()
	now.setHours(23, 59, 59, 999) // End of today

	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
	thirtyDaysAgo.setHours(0, 0, 0, 0) // Start of day

	return {
		dateRange: {
			from: thirtyDaysAgo,
			to: now,
		},
		versions: [], // Empty = all versions
		categories: [], // Empty = all categories
	}
}

export interface AgentsStatsSlice {
	// State
	agentStatsFilters: AgentStatsFilters
	agentChangesModal: AgentChangesModalState

	// Filter Actions
	setAgentStatsDateRange: (from: Date, to: Date) => void
	setAgentStatsVersions: (versions: string[]) => void
	setAgentStatsCategories: (categories: string[]) => void
	resetAgentStatsFilters: () => void
	updateAgentStatsFilters: (filters: Partial<AgentStatsFilters>) => void

	// Modal Actions
	openAgentChangesModal: (agentEmail: string, changeType?: AgentChangeType) => void
	closeAgentChangesModal: () => void
	setAgentChangesType: (changeType: AgentChangeType) => void
}

export const createAgentsStatsSlice: StateCreator<
	AgentsStatsSlice,
	[],
	[],
	AgentsStatsSlice
> = set => ({
	// Initial state
	agentStatsFilters: getDefaultAgentStatsFilters(),
	agentChangesModal: getDefaultAgentChangesModalState(),

	// Filter Actions
	setAgentStatsDateRange: (from, to) =>
		set(state => ({
			agentStatsFilters: {
				...state.agentStatsFilters,
				dateRange: { from, to },
			},
		})),

	setAgentStatsVersions: versions =>
		set(state => ({
			agentStatsFilters: {
				...state.agentStatsFilters,
				versions,
			},
		})),

	setAgentStatsCategories: categories =>
		set(state => ({
			agentStatsFilters: {
				...state.agentStatsFilters,
				categories,
			},
		})),

	resetAgentStatsFilters: () =>
		set({
			agentStatsFilters: getDefaultAgentStatsFilters(),
		}),

	updateAgentStatsFilters: filters =>
		set(state => ({
			agentStatsFilters: {
				...state.agentStatsFilters,
				...filters,
			},
		})),

	// Modal Actions
	openAgentChangesModal: (agentEmail, changeType = 'all') =>
		set({
			agentChangesModal: {
				isOpen: true,
				agentEmail,
				changeType,
			},
		}),

	closeAgentChangesModal: () =>
		set({
			agentChangesModal: getDefaultAgentChangesModalState(),
		}),

	setAgentChangesType: changeType =>
		set(state => ({
			agentChangesModal: {
				...state.agentChangesModal,
				changeType,
			},
		})),
})
