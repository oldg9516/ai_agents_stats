'use client'

import type { DashboardFilters } from '@/lib/supabase/types'
import { useLocalFilterState } from '@/lib/hooks/use-local-filter-state'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { FilterBarLayout } from './filter-bar-layout'
import { MultiSelectFilter } from './multi-select-filter'

interface FilterBarProps {
	filters: DashboardFilters
	onApplyFilters: (filters: {
		versions: string[]
		categories: string[]
		agents: string[]
		hideRequiresEditing: boolean
	}) => void
	onReset: () => void
	availableVersions: string[]
	availableCategories: string[]
	availableAgents: string[]
	onClose?: () => void
}

export function FilterBar({
	filters,
	onApplyFilters,
	onReset,
	availableVersions,
	availableCategories,
	availableAgents,
	onClose,
}: FilterBarProps) {
	const t = useTranslations()

	const { values, setValue, handleApply, handleReset } = useLocalFilterState(
		{
			versions: filters.versions ?? [],
			categories: filters.categories ?? [],
			agents: filters.agents ?? [],
			hideRequiresEditing: filters.hideRequiresEditing ?? false,
		},
		{ onApply: onApplyFilters, onReset, onClose }
	)

	// Check if selected versions are still available when availableVersions changes
	useEffect(() => {
		if (values.versions.length > 0 && availableVersions.length > 0) {
			const unavailableVersions = values.versions.filter(
				(v) => !availableVersions.includes(v)
			)
			if (unavailableVersions.length > 0) {
				toast.warning(
					`Some selected versions (${unavailableVersions.join(', ')}) are not available for this date range`,
					{ duration: 5000 }
				)
				setValue('versions', values.versions.filter((v) => availableVersions.includes(v)))
			}
		}
	}, [availableVersions]) // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<FilterBarLayout.Root>
			<FilterBarLayout.Fields>
				<FilterBarLayout.Toggle
					id='hide-requires-editing-dashboard'
					label={t('filters.hideRequiresEditing')}
					description={t('filters.hideRequiresEditingDescription')}
					checked={values.hideRequiresEditing}
					onChange={v => setValue('hideRequiresEditing', v)}
				/>
				<MultiSelectFilter
					label={t('filters.versions')}
					options={availableVersions}
					selected={values.versions}
					onChange={v => setValue('versions', v)}
					placeholder={t('filters.searchVersions')}
					allowEmpty={true}
				/>
				<MultiSelectFilter
					label={t('filters.categories')}
					options={availableCategories}
					selected={values.categories}
					onChange={v => setValue('categories', v)}
					placeholder={t('filters.searchCategories')}
					allowEmpty={true}
				/>
				<MultiSelectFilter
					label={t('filters.agents')}
					options={availableAgents}
					selected={values.agents}
					onChange={v => setValue('agents', v)}
					placeholder={t('filters.searchAgents')}
					allowEmpty={true}
				/>
			</FilterBarLayout.Fields>
			<FilterBarLayout.Actions onApply={handleApply} onReset={handleReset} />
		</FilterBarLayout.Root>
	)
}
