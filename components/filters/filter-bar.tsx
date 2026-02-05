'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { DashboardFilters } from '@/lib/supabase/types'
import { IconRefresh, IconCheck } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { MultiSelectFilter } from './multi-select-filter'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

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

/**
 * Filter Bar - Container for dashboard filters (without date range)
 *
 * Features:
 * - Version multi-select
 * - Category multi-select
 * - Agent multi-select (by email)
 * - Apply button (deferred filter application)
 * - Reset button
 *
 * Note: Date range filter moved to page level (DateRangeSelector component)
 */
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

	// Local state for pending filter changes
	const [localVersions, setLocalVersions] = useState<string[]>(filters.versions ?? [])
	const [localCategories, setLocalCategories] = useState<string[]>(filters.categories ?? [])
	const [localAgents, setLocalAgents] = useState<string[]>(filters.agents ?? [])
	const [localHideRequiresEditing, setLocalHideRequiresEditing] = useState(filters.hideRequiresEditing ?? false)

	// Refs to track previous values and avoid stale closures
	const filtersRef = useRef(filters)

	// Keep refs in sync
	useEffect(() => {
		filtersRef.current = filters
	}, [filters])

	// Sync local state when filters prop changes (e.g., after reset)
	const filtersKey = JSON.stringify({
		versions: filters.versions,
		categories: filters.categories,
		agents: filters.agents,
		hideRequiresEditing: filters.hideRequiresEditing,
	})

	useEffect(() => {
		setLocalVersions(filters.versions ?? [])
		setLocalCategories(filters.categories ?? [])
		setLocalAgents(filters.agents ?? [])
		setLocalHideRequiresEditing(filters.hideRequiresEditing ?? false)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filtersKey])

	// Check if selected versions are still available when availableVersions changes
	useEffect(() => {
		if (localVersions.length > 0 && availableVersions.length > 0) {
			const unavailableVersions = localVersions.filter(
				(v) => !availableVersions.includes(v)
			)

			if (unavailableVersions.length > 0) {
				// Show toast notification
				toast.warning(
					`Some selected versions (${unavailableVersions.join(', ')}) are not available for this date range`,
					{
						duration: 5000,
					}
				)

				// Auto-remove unavailable versions from local state
				setLocalVersions(prev => prev.filter((v) => availableVersions.includes(v)))
			}
		}
	}, [availableVersions, localVersions])

	// Apply filters and close sheet
	const handleApply = () => {
		onApplyFilters({
			versions: localVersions,
			categories: localCategories,
			agents: localAgents,
			hideRequiresEditing: localHideRequiresEditing,
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
				{/* Hide Requires Editing Toggle */}
				<div className='flex items-center justify-between rounded-lg border p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'>
					<div className='space-y-0.5'>
						<Label
							htmlFor='hide-requires-editing-dashboard'
							className='text-sm font-medium cursor-pointer'
						>
							{t('filters.hideRequiresEditing')}
						</Label>
						<p className='text-xs text-muted-foreground'>
							{t('filters.hideRequiresEditingDescription')}
						</p>
					</div>
					<Switch
						id='hide-requires-editing-dashboard'
						checked={localHideRequiresEditing}
						onCheckedChange={setLocalHideRequiresEditing}
					/>
				</div>

				{/* Version Filter */}
				<MultiSelectFilter
					label={t('filters.versions')}
					options={availableVersions}
					selected={localVersions}
					onChange={setLocalVersions}
					placeholder={t('filters.searchVersions')}
					allowEmpty={true}
				/>

				{/* Category Filter */}
				<MultiSelectFilter
					label={t('filters.categories')}
					options={availableCategories}
					selected={localCategories}
					onChange={setLocalCategories}
					placeholder={t('filters.searchCategories')}
					allowEmpty={true}
				/>

				{/* Agent Filter */}
				<MultiSelectFilter
					label={t('filters.agents')}
					options={availableAgents}
					selected={localAgents}
					onChange={setLocalAgents}
					placeholder={t('filters.searchAgents')}
					allowEmpty={true}
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
