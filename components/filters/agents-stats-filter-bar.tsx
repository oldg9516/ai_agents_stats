'use client'

import type { AgentStatsFilters } from '@/lib/supabase/types'
import { useLocalFilterState } from '@/lib/hooks/use-local-filter-state'
import { useTranslations } from 'next-intl'
import { FilterBarLayout } from './filter-bar-layout'
import { MultiSelectFilter } from './multi-select-filter'

interface AgentsStatsFilterBarProps {
	filters: AgentStatsFilters
	onApplyFilters: (filters: { versions: string[]; categories: string[]; agents: string[] }) => void
	onReset: () => void
	availableVersions: string[]
	availableCategories: string[]
	availableAgents: string[]
	onClose?: () => void
}

export function AgentsStatsFilterBar({
	filters,
	onApplyFilters,
	onReset,
	availableVersions,
	availableCategories,
	availableAgents,
	onClose,
}: AgentsStatsFilterBarProps) {
	const t = useTranslations()

	const { values, setValue, handleApply, handleReset } = useLocalFilterState(
		{
			versions: filters.versions ?? [],
			categories: filters.categories ?? [],
			agents: filters.agents ?? [],
		},
		{ onApply: onApplyFilters, onReset, onClose }
	)

	return (
		<FilterBarLayout.Root>
			<FilterBarLayout.Fields>
				<MultiSelectFilter
					label={t('filters.agents')}
					options={availableAgents}
					selected={values.agents}
					onChange={v => setValue('agents', v)}
					placeholder={t('filters.searchAgents')}
				/>
				<MultiSelectFilter
					label={t('filters.versions')}
					options={availableVersions}
					selected={values.versions}
					onChange={v => setValue('versions', v)}
					placeholder={t('filters.searchVersions')}
				/>
				<MultiSelectFilter
					label={t('filters.categories')}
					options={availableCategories}
					selected={values.categories}
					onChange={v => setValue('categories', v)}
					placeholder={t('filters.searchCategories')}
				/>
			</FilterBarLayout.Fields>
			<FilterBarLayout.Actions onApply={handleApply} onReset={handleReset} />
		</FilterBarLayout.Root>
	)
}
