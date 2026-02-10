import type {
	AgentStatsFilters,
	AgentChangeType,
	AgentChangesModalState,
} from '@/lib/supabase/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

function getDefaultAgentChangesModalState(): AgentChangesModalState {
	return { isOpen: false, agentEmail: null, changeType: 'all' }
}

function getDefaultAgentStatsFilters(): AgentStatsFilters {
	return {
		dateRange: getDefaultDateRange(30),
		versions: [],
		categories: [],
	}
}

export interface AgentsStatsSlice {
	agentStatsFilters: AgentStatsFilters
	agentChangesModal: AgentChangesModalState
	setAgentStatsDateRange: (from: Date, to: Date) => void
	setAgentStatsVersions: (versions: string[]) => void
	setAgentStatsCategories: (categories: string[]) => void
	resetAgentStatsFilters: () => void
	updateAgentStatsFilters: (filters: Partial<AgentStatsFilters>) => void
	openAgentChangesModal: (agentEmail: string, changeType?: AgentChangeType) => void
	closeAgentChangesModal: () => void
	setAgentChangesType: (changeType: AgentChangeType) => void
}

export const createAgentsStatsSlice: StateCreator<
	AgentsStatsSlice,
	[],
	[],
	AgentsStatsSlice
> = set => {
	const ops = filterSliceActions(set, 'agentStatsFilters', getDefaultAgentStatsFilters)

	return {
		agentStatsFilters: getDefaultAgentStatsFilters(),
		agentChangesModal: getDefaultAgentChangesModalState(),

		setAgentStatsDateRange: ops.setDateRange,
		setAgentStatsVersions: v => ops.setField('versions', v),
		setAgentStatsCategories: v => ops.setField('categories', v),
		resetAgentStatsFilters: ops.resetFilters,
		updateAgentStatsFilters: ops.updateFilters,

		openAgentChangesModal: (agentEmail, changeType = 'all') =>
			set({ agentChangesModal: { isOpen: true, agentEmail, changeType } }),
		closeAgentChangesModal: () =>
			set({ agentChangesModal: getDefaultAgentChangesModalState() }),
		setAgentChangesType: changeType =>
			set(state => ({ agentChangesModal: { ...state.agentChangesModal, changeType } })),
	}
}
