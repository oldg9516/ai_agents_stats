import type { AutomationOverviewFilters } from '@/lib/supabase/types'
import { StateCreator } from 'zustand'
import { filterSliceActions, getDefaultDateRange } from '../create-filter-slice'

function getDefaultAutomationOverviewFilters(): AutomationOverviewFilters {
	return {
		dateRange: getDefaultDateRange(30),
		categories: [],
		versions: [],
	}
}

export interface AutomationOverviewSlice {
	automationOverviewFilters: AutomationOverviewFilters
	setAutomationOverviewDateRange: (from: Date, to: Date) => void
	setAutomationOverviewCategories: (categories: string[]) => void
	setAutomationOverviewVersions: (versions: string[]) => void
	resetAutomationOverviewFilters: () => void
	updateAutomationOverviewFilters: (filters: Partial<AutomationOverviewFilters>) => void
}

export const createAutomationOverviewSlice: StateCreator<
	AutomationOverviewSlice,
	[],
	[],
	AutomationOverviewSlice
> = set => {
	const ops = filterSliceActions(set, 'automationOverviewFilters', getDefaultAutomationOverviewFilters)

	return {
		automationOverviewFilters: getDefaultAutomationOverviewFilters(),
		setAutomationOverviewDateRange: ops.setDateRange,
		setAutomationOverviewCategories: v => ops.setField('categories', v),
		setAutomationOverviewVersions: v => ops.setField('versions', v),
		resetAutomationOverviewFilters: ops.resetFilters,
		updateAutomationOverviewFilters: ops.updateFilters,
	}
}
