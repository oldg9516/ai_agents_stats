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
import { IconCheck, IconRefresh } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
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
	}) => void
	onReset: () => void
	availableVersions: string[]
	availableCategories: string[]
	onClose?: () => void
}

/**
 * Support Filter Bar - Filters for support overview (without date range)
 *
 * Features:
 * - Status multi-select
 * - Request type multi-select
 * - Category multi-select
 * - Requirements multi-select
 * - Version multi-select
 * - Apply button (deferred filter application)
 * - Reset button
 *
 * Note: Date range filter moved to page level (DateRangeSelector component)
 */
export function SupportFilterBar({
	filters,
	onApplyFilters,
	onReset,
	availableVersions,
	availableCategories,
	onClose,
}: SupportFilterBarProps) {
	const t = useTranslations()

	// Local state for pending filter changes (with fallback to empty arrays)
	const [localStatuses, setLocalStatuses] = useState<string[]>(filters.statuses ?? [])
	const [localRequestTypes, setLocalRequestTypes] = useState<string[]>(filters.requestTypes ?? [])
	const [localCategories, setLocalCategories] = useState<string[]>(filters.categories ?? [])
	const [localRequirements, setLocalRequirements] = useState<string[]>(filters.requirements ?? [])
	const [localVersions, setLocalVersions] = useState<string[]>(filters.versions ?? [])
	const [localPendingDraftsOnly, setLocalPendingDraftsOnly] = useState(filters.pendingDraftsOnly ?? false)

	// Sync local state when filters prop changes (e.g., after reset)
	// Use JSON.stringify to create a stable dependency
	const filtersKey = JSON.stringify({
		statuses: filters.statuses,
		requestTypes: filters.requestTypes,
		categories: filters.categories,
		requirements: filters.requirements,
		versions: filters.versions,
		pendingDraftsOnly: filters.pendingDraftsOnly,
	})

	useEffect(() => {
		setLocalStatuses(filters.statuses ?? [])
		setLocalRequestTypes(filters.requestTypes ?? [])
		setLocalCategories(filters.categories ?? [])
		setLocalRequirements(filters.requirements ?? [])
		setLocalVersions(filters.versions ?? [])
		setLocalPendingDraftsOnly(filters.pendingDraftsOnly ?? false)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filtersKey])

	// Get all available options with labels
	const statusOptions = getAllStatuses().map(getStatusLabel)
	const requestTypeOptions = getAllRequestTypes().map(getRequestTypeLabel)

	// Map selected values to labels for display
	const selectedStatusLabels = localStatuses.map(getStatusLabel)
	const selectedRequestTypeLabels = localRequestTypes.map(getRequestTypeLabel)

	// Handle changes with label-to-value mapping
	const handleStatusChange = (labels: string[]) => {
		const statuses = getAllStatuses().filter(status =>
			labels.includes(getStatusLabel(status))
		)
		setLocalStatuses(statuses)
	}

	const handleRequestTypeChange = (labels: string[]) => {
		const types = getAllRequestTypes().filter(type =>
			labels.includes(getRequestTypeLabel(type))
		)
		setLocalRequestTypes(types)
	}

	// Check if there are pending changes (compare with null-safe values)
	const hasChanges =
		JSON.stringify([...localStatuses].sort()) !== JSON.stringify([...(filters.statuses ?? [])].sort()) ||
		JSON.stringify([...localRequestTypes].sort()) !== JSON.stringify([...(filters.requestTypes ?? [])].sort()) ||
		JSON.stringify([...localCategories].sort()) !== JSON.stringify([...(filters.categories ?? [])].sort()) ||
		JSON.stringify([...localRequirements].sort()) !== JSON.stringify([...(filters.requirements ?? [])].sort()) ||
		JSON.stringify([...localVersions].sort()) !== JSON.stringify([...(filters.versions ?? [])].sort()) ||
		localPendingDraftsOnly !== (filters.pendingDraftsOnly ?? false)

	// Apply filters and close sheet
	const handleApply = () => {
		onApplyFilters({
			statuses: localStatuses,
			requestTypes: localRequestTypes,
			categories: localCategories,
			requirements: localRequirements,
			versions: localVersions,
			pendingDraftsOnly: localPendingDraftsOnly,
		})
		onClose?.()
	}

	// Reset and sync local state
	const handleReset = () => {
		onReset()
		// Local state will be synced via useEffect when filters prop changes
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
						checked={localPendingDraftsOnly}
						onCheckedChange={setLocalPendingDraftsOnly}
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

				{/* Category (request_subtype) */}
				<MultiSelectFilter
					label={t('filters.category')}
					options={availableCategories}
					selected={localCategories}
					onChange={setLocalCategories}
					placeholder={t('filters.searchCategories')}
				/>

				{/* Requirements */}
				<RequirementsFilter
					selected={localRequirements}
					onChange={setLocalRequirements}
				/>

				{/* Version */}
				<MultiSelectFilter
					label={t('filters.versions')}
					options={availableVersions}
					selected={localVersions}
					onChange={setLocalVersions}
					placeholder={t('filters.searchVersions')}
					searchable={false}
				/>
			</div>

			{/* Action Buttons */}
			<div className='flex flex-col sm:flex-row gap-2 sm:justify-end'>
				<Button
					onClick={handleReset}
					variant='outline'
					size='sm'
					className='w-full sm:w-auto'
				>
					<IconRefresh className='mr-2 h-4 w-4' />
					{t('filters.resetFilters')}
				</Button>
				<Button
					onClick={handleApply}
					variant='default'
					size='sm'
					className='w-full sm:w-auto'
				>
					<IconCheck className='mr-2 h-4 w-4' />
					{t('filters.apply')}
				</Button>
			</div>
		</div>
	)
}
