'use client'

import { useLocalFilterState } from '@/lib/hooks/use-local-filter-state'
import { useTranslations } from 'next-intl'
import { FilterBarLayout } from './filter-bar-layout'
import { MultiSelectFilter } from './multi-select-filter'

interface SubcategoriesStatsFilterBarProps {
	versions: string[]
	agents: string[]
	onApplyFilters: (filters: { versions: string[]; agents: string[] }) => void
	onReset: () => void
	availableVersions: string[]
	availableAgents: string[]
	onClose?: () => void
}

export function SubcategoriesStatsFilterBar({
	versions,
	agents,
	onApplyFilters,
	onReset,
	availableVersions,
	availableAgents,
	onClose,
}: SubcategoriesStatsFilterBarProps) {
	const t = useTranslations('filters')

	const { values, setValue, handleApply, handleReset } = useLocalFilterState(
		{ versions: versions ?? [], agents: agents ?? [] },
		{ onApply: onApplyFilters, onReset, onClose }
	)

	return (
		<FilterBarLayout.Root>
			<FilterBarLayout.Fields>
				<MultiSelectFilter
					label={t('versions')}
					options={availableVersions}
					selected={values.versions}
					onChange={v => setValue('versions', v)}
					placeholder={t('searchVersions')}
				/>
				<MultiSelectFilter
					label={t('agents')}
					options={availableAgents}
					selected={values.agents}
					onChange={v => setValue('agents', v)}
					placeholder={t('searchAgents')}
				/>
			</FilterBarLayout.Fields>
			<FilterBarLayout.Actions onApply={handleApply} onReset={handleReset} />
		</FilterBarLayout.Root>
	)
}
