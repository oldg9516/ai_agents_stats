'use client'

import {
	getAllRequestTypes,
	getRequestTypeLabel,
} from '@/constants/request-types'
import { getAllStatuses, getStatusLabel } from '@/constants/support-statuses'
import type { SupportFilters } from '@/lib/supabase/types'
import { useLocalFilterState } from '@/lib/hooks/use-local-filter-state'
import { useTranslations } from 'next-intl'
import { FilterBarLayout } from './filter-bar-layout'
import { MultiSelectFilter } from './multi-select-filter'
import { RequirementsFilter } from './requirements-filter'

interface SupportFilterBarProps {
	filters: SupportFilters
	onApplyFilters: (filters: {
		statuses: string[]
		requestTypes: string[]
		categories: string[]
		requirements: string[]
		versions: string[]
		pendingDraftsOnly: boolean
		hideRequiresEditing: boolean
	}) => void
	onReset: () => void
	availableVersions: string[]
	availableCategories: string[]
	onClose?: () => void
}

export function SupportFilterBar({
	filters,
	onApplyFilters,
	onReset,
	availableVersions,
	availableCategories,
	onClose,
}: SupportFilterBarProps) {
	const t = useTranslations()

	const { values, setValue, handleApply, handleReset } = useLocalFilterState(
		{
			statuses: filters.statuses ?? [],
			requestTypes: filters.requestTypes ?? [],
			categories: filters.categories ?? [],
			requirements: filters.requirements ?? [],
			versions: filters.versions ?? [],
			pendingDraftsOnly: filters.pendingDraftsOnly ?? false,
			hideRequiresEditing: filters.hideRequiresEditing ?? false,
		},
		{ onApply: onApplyFilters, onReset, onClose }
	)

	// Get all available options with labels
	const statusOptions = getAllStatuses().map(getStatusLabel)
	const requestTypeOptions = getAllRequestTypes().map(getRequestTypeLabel)

	// Map selected values to labels for display
	const selectedStatusLabels = values.statuses.map(getStatusLabel)
	const selectedRequestTypeLabels = values.requestTypes.map(getRequestTypeLabel)

	// Handle changes with label-to-value mapping
	const handleStatusChange = (labels: string[]) => {
		const statuses = getAllStatuses().filter(status =>
			labels.includes(getStatusLabel(status))
		)
		setValue('statuses', statuses)
	}

	const handleRequestTypeChange = (labels: string[]) => {
		const types = getAllRequestTypes().filter(type =>
			labels.includes(getRequestTypeLabel(type))
		)
		setValue('requestTypes', types)
	}

	return (
		<FilterBarLayout.Root>
			<FilterBarLayout.Fields>
				<FilterBarLayout.Toggle
					id='pending-drafts'
					label={t('filters.pendingDraftsOnly')}
					description={t('filters.pendingDraftsDescription')}
					checked={values.pendingDraftsOnly}
					onChange={v => setValue('pendingDraftsOnly', v)}
					color='amber'
				/>
				<FilterBarLayout.Toggle
					id='hide-requires-editing'
					label={t('filters.hideRequiresEditing')}
					description={t('filters.hideRequiresEditingDescription')}
					checked={values.hideRequiresEditing}
					onChange={v => setValue('hideRequiresEditing', v)}
				/>
				<MultiSelectFilter
					label={t('filters.status')}
					options={statusOptions}
					selected={selectedStatusLabels}
					onChange={handleStatusChange}
					placeholder={t('filters.searchStatuses')}
				/>
				<MultiSelectFilter
					label={t('filters.requestType')}
					options={requestTypeOptions}
					selected={selectedRequestTypeLabels}
					onChange={handleRequestTypeChange}
					placeholder={t('filters.searchRequestTypes')}
				/>
				<MultiSelectFilter
					label={t('filters.category')}
					options={availableCategories}
					selected={values.categories}
					onChange={v => setValue('categories', v)}
					placeholder={t('filters.searchCategories')}
				/>
				<RequirementsFilter
					selected={values.requirements}
					onChange={v => setValue('requirements', v)}
				/>
				<MultiSelectFilter
					label={t('filters.versions')}
					options={availableVersions}
					selected={values.versions}
					onChange={v => setValue('versions', v)}
					placeholder={t('filters.searchVersions')}
					searchable={false}
				/>
			</FilterBarLayout.Fields>
			<FilterBarLayout.Actions onApply={handleApply} onReset={handleReset} />
		</FilterBarLayout.Root>
	)
}
