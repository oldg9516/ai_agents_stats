'use client'

import { Button } from '@/components/ui/button'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import type { DashboardFilters } from '@/lib/supabase/types'
import { IconRefresh } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { DateRangeFilter } from './date-range-filter'
import { MultiSelectFilter } from './multi-select-filter'

interface FilterBarProps {
	filters: DashboardFilters
	onFiltersChange: (filters: Partial<DashboardFilters>) => void
	onReset: () => void
	availableVersions: string[]
	availableCategories: string[]
}

/**
 * Filter Bar - Container for all dashboard filters
 *
 * Features:
 * - Date range filter
 * - Version multi-select
 * - Category multi-select
 * - Agent multi-select
 * - Reset button
 */
export function FilterBar({
	filters,
	onFiltersChange,
	onReset,
	availableVersions,
	availableCategories,
}: FilterBarProps) {
	const t = useTranslations()

	return (
		<div className='space-y-4'>
			<div className='grid gap-4 sm:gap-6 grid-cols-1'>
				{/* Date Range Filter */}
				<DateRangeFilter
					from={filters.dateRange.from}
					to={filters.dateRange.to}
					onChange={(from, to) => onFiltersChange({ dateRange: { from, to } })}
				/>

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
					label={t('filters.qualifiedAgents')}
					options={[...QUALIFIED_AGENTS]}
					selected={filters.agents}
					onChange={agents => onFiltersChange({ agents })}
					placeholder={t('filters.searchAgents')}
					searchable={true}
					allowEmpty={false} // At least one agent must be selected
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
