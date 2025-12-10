'use client'

import { Button } from '@/components/ui/button'
import type { DashboardFilters } from '@/lib/supabase/types'
import { IconRefresh } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { MultiSelectFilter } from './multi-select-filter'
import { useEffect } from 'react'
import { toast } from 'sonner'

interface FilterBarProps {
	filters: DashboardFilters
	onFiltersChange: (filters: Partial<DashboardFilters>) => void
	onReset: () => void
	availableVersions: string[]
	availableCategories: string[]
	availableAgents: string[]
}

/**
 * Filter Bar - Container for dashboard filters (without date range)
 *
 * Features:
 * - Version multi-select
 * - Category multi-select
 * - Agent multi-select (by email)
 * - Reset button
 *
 * Note: Date range filter moved to page level (DateRangeSelector component)
 */
export function FilterBar({
	filters,
	onFiltersChange,
	onReset,
	availableVersions,
	availableCategories,
	availableAgents,
}: FilterBarProps) {
	const t = useTranslations()

	// Check if selected versions are still available when availableVersions changes
	useEffect(() => {
		if (filters.versions.length > 0 && availableVersions.length > 0) {
			const unavailableVersions = filters.versions.filter(
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

				// Auto-remove unavailable versions
				const newVersions = filters.versions.filter((v) =>
					availableVersions.includes(v)
				)
				onFiltersChange({ versions: newVersions })
			}
		}
	}, [availableVersions]) // Only run when availableVersions changes

	return (
		<div className='space-y-4'>
			<div className='grid gap-4 sm:gap-6 grid-cols-1'>
				{/* Version Filter */}
				<MultiSelectFilter
					label={t('filters.versions')}
					options={availableVersions}
					selected={filters.versions}
					onChange={versions => onFiltersChange({ versions })}
					placeholder={t('filters.searchVersions')}
					allowEmpty={true}
				/>

				{/* Category Filter */}
				<MultiSelectFilter
					label={t('filters.categories')}
					options={availableCategories}
					selected={filters.categories}
					onChange={categories => onFiltersChange({ categories })}
					placeholder={t('filters.searchCategories')}
					allowEmpty={true}
				/>

				{/* Agent Filter */}
				<MultiSelectFilter
					label={t('filters.agents')}
					options={availableAgents}
					selected={filters.agents ?? []}
					onChange={agents => onFiltersChange({ agents })}
					placeholder={t('filters.searchAgents')}
					allowEmpty={true}
				/>
			</div>

			{/* Reset Button */}
			<div className='flex justify-end'>
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
