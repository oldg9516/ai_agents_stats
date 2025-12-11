'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
	getAllRequestTypes,
	getRequestTypeLabel,
} from '@/constants/request-types'
import { getAllStatuses, getStatusLabel } from '@/constants/support-statuses'
import type { SupportFilters } from '@/lib/supabase/types'
import { IconRefresh } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { MultiSelectFilter } from './multi-select-filter'
import { RequirementsFilter } from './requirements-filter'

interface SupportFilterBarProps {
	filters: SupportFilters
	onStatusesChange: (statuses: string[]) => void
	onRequestTypesChange: (types: string[]) => void
	onRequirementsChange: (requirements: string[]) => void
	onVersionsChange: (versions: string[]) => void
	onPendingDraftsOnlyChange: (enabled: boolean) => void
	onReset: () => void
	availableVersions: string[]
}

/**
 * Support Filter Bar - Filters for support overview (without date range)
 *
 * Features:
 * - Status multi-select
 * - Request type multi-select
 * - Requirements multi-select
 * - Version multi-select
 * - Reset button
 *
 * Note: Date range filter moved to page level (DateRangeSelector component)
 */
export function SupportFilterBar({
	filters,
	onStatusesChange,
	onRequestTypesChange,
	onRequirementsChange,
	onVersionsChange,
	onPendingDraftsOnlyChange,
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
				{/* Pending AI Drafts Toggle */}
				<div className='flex items-center justify-between rounded-lg border p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'>
					<div className='space-y-0.5'>
						<Label
							htmlFor='pending-drafts'
							className='text-sm font-medium cursor-pointer'
						>
							{t('filters.pendingDraftsOnly')}
						</Label>
						<p className='text-xs text-muted-foreground'>
							{t('filters.pendingDraftsDescription')}
						</p>
					</div>
					<Switch
						id='pending-drafts'
						checked={filters.pendingDraftsOnly}
						onCheckedChange={onPendingDraftsOnlyChange}
					/>
				</div>

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
