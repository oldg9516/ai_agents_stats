'use client'

import { DateRangeFilter } from './date-range-filter'
import { MultiSelectFilter } from './multi-select-filter'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IconFilterOff } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { CategoryFilters } from '@/lib/supabase/types'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'

interface CategoryDetailFiltersProps {
	filters: CategoryFilters
	availableVersions: string[]
	onFiltersChange: (filters: CategoryFilters) => void
	onReset: () => void
}

/**
 * Category Detail Filters Component
 *
 * Filters for category detail page:
 * - Date range (quick buttons + manual)
 * - Versions multi-select
 * - Agents multi-select (qualified agents)
 * - Reset button
 */
export function CategoryDetailFilters({
	filters,
	availableVersions,
	onFiltersChange,
	onReset,
}: CategoryDetailFiltersProps) {
	const t = useTranslations('category.filters')

	// Handler for date range change
	const handleDateRangeChange = (from: Date, to: Date) => {
		onFiltersChange({
			...filters,
			dateRange: { from, to },
		})
	}

	// Handler for versions change
	const handleVersionsChange = (versions: string[]) => {
		onFiltersChange({
			...filters,
			versions,
		})
	}

	// Handler for agents change
	const handleAgentsChange = (agents: string[]) => {
		onFiltersChange({
			...filters,
			agents,
		})
	}

	return (
		<Card className='p-4 space-y-4'>
			<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
				<h3 className='font-semibold text-sm'>{t('title')}</h3>
				<Button
					variant='outline'
					size='sm'
					onClick={onReset}
					className='w-full sm:w-auto'
				>
					<IconFilterOff className='h-4 w-4 mr-2' />
					{t('reset')}
				</Button>
			</div>

			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
				{/* Date Range Filter */}
				<div>
					<DateRangeFilter
						from={filters.dateRange.from}
						to={filters.dateRange.to}
						onChange={handleDateRangeChange}
					/>
				</div>

				{/* Versions Filter */}
				<div>
					<MultiSelectFilter
						label={t('versions')}
						options={availableVersions}
						selected={filters.versions}
						onChange={handleVersionsChange}
						placeholder={t('searchVersions')}
						searchable={false}
						allowEmpty={true}
					/>
				</div>

				{/* Agents Filter */}
				<div>
					<MultiSelectFilter
						label={t('agents')}
						options={[...QUALIFIED_AGENTS]}
						selected={filters.agents}
						onChange={handleAgentsChange}
						placeholder={t('searchAgents')}
						searchable={true}
						allowEmpty={true}
					/>
				</div>
			</div>

			{/* Active Filters Summary */}
			<div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
				{filters.versions.length > 0 && (
					<span>
						{t('versionsSelected', { count: filters.versions.length })}
					</span>
				)}
				{filters.agents.length > 0 && filters.agents.length < QUALIFIED_AGENTS.length && (
					<span>
						{t('agentsSelected', { count: filters.agents.length })}
					</span>
				)}
			</div>
		</Card>
	)
}
