'use client'

import { Button } from '@/components/ui/button'
import {
	getAllRequestTypes,
	getRequestTypeLabel,
} from '@/constants/request-types'
import { getAllStatuses, getStatusLabel } from '@/constants/support-statuses'
import type { SupportFilters } from '@/lib/supabase/types'
import { IconRefresh } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { DateRangeFilter } from './date-range-filter'
import { MultiSelectFilter } from './multi-select-filter'
import { RequirementsFilter } from './requirements-filter'

interface SupportFilterBarProps {
	filters: SupportFilters
	onDateRangeChange: (from: Date, to: Date) => void
	onStatusesChange: (statuses: string[]) => void
	onRequestTypesChange: (types: string[]) => void
	onRequirementsChange: (requirements: string[]) => void
	onVersionsChange: (versions: string[]) => void
	onReset: () => void
	availableVersions: string[]
}

/**
 * Support Filter Bar - All filters for support overview
 *
 * Features:
 * - Date range picker
 * - Status multi-select
 * - Request type multi-select
 * - Requirements multi-select
 * - Version multi-select
 * - Reset button
 */
export function SupportFilterBar({
	filters,
	onDateRangeChange,
	onStatusesChange,
	onRequestTypesChange,
	onRequirementsChange,
	onVersionsChange,
	onReset,
	availableVersions,
}: SupportFilterBarProps) {
	const t = useTranslations()

	// Get all available options with labels
	const statusOptions = getAllStatuses().map(getStatusLabel)
	const requestTypeOptions = getAllRequestTypes().map(getRequestTypeLabel)

	// Map selected values to labels for display
	const selectedStatusLabels = filters.statuses.map(getStatusLabel)
	const selectedRequestTypeLabels =
		filters.requestTypes.map(getRequestTypeLabel)

	// Handle changes with label-to-value mapping
	const handleStatusChange = (labels: string[]) => {
		const statuses = getAllStatuses().filter(status =>
			labels.includes(getStatusLabel(status))
		)
		onStatusesChange(statuses)
	}

	const handleRequestTypeChange = (labels: string[]) => {
		const types = getAllRequestTypes().filter(type =>
			labels.includes(getRequestTypeLabel(type))
		)
		onRequestTypesChange(types)
	}

	return (
		<div className='space-y-4'>
			<div className='grid gap-4 sm:gap-6 grid-cols-1'>
				{/* Date Range */}
				<DateRangeFilter
					from={filters.dateRange.from}
					to={filters.dateRange.to}
					onChange={onDateRangeChange}
				/>

				{/* Status */}
				<MultiSelectFilter
					label={t('filters.status')}
					options={statusOptions}
					selected={selectedStatusLabels}
					onChange={handleStatusChange}
					placeholder={t('filters.searchStatuses')}
				/>

				{/* Request Type */}
				<MultiSelectFilter
					label={t('filters.requestType')}
					options={requestTypeOptions}
					selected={selectedRequestTypeLabels}
					onChange={handleRequestTypeChange}
					placeholder={t('filters.searchRequestTypes')}
				/>

				{/* Requirements */}
				<RequirementsFilter
					selected={filters.requirements}
					onChange={onRequirementsChange}
				/>

				{/* Version */}
				<MultiSelectFilter
					label={t('filters.versions')}
					options={availableVersions}
					selected={filters.versions}
					onChange={onVersionsChange}
					placeholder={t('filters.searchVersions')}
					searchable={false}
				/>
			</div>

			{/* Reset Button */}
			<div className='flex justify-center sm:justify-end'>
				<Button
					onClick={onReset}
					variant='outline'
					size='sm'
					className='w-full sm:w-auto'
				>
					<IconRefresh className='mr-2 h-4 w-4' />
					{t('filters.resetFilters')}
				</Button>
			</div>
		</div>
	)
}
