'use client'

import { Button } from '@/components/ui/button'
import type { AgentStatsFilters } from '@/lib/supabase/types'
import { IconRefresh } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { MultiSelectFilter } from './multi-select-filter'

interface AgentsStatsFilterBarProps {
	filters: AgentStatsFilters
	onVersionsChange: (versions: string[]) => void
	onCategoriesChange: (categories: string[]) => void
	onReset: () => void
	availableVersions: string[]
	availableCategories: string[]
}

/**
 * Agents Stats Filter Bar (inside FilterSheet)
 *
 * Features:
 * - Version multi-select
 * - Category multi-select
 * - Reset button
 */
export function AgentsStatsFilterBar({
	filters,
	onVersionsChange,
	onCategoriesChange,
	onReset,
	availableVersions,
	availableCategories,
}: AgentsStatsFilterBarProps) {
	const t = useTranslations()

	return (
		<div className='space-y-6'>
			{/* Version Filter */}
			<MultiSelectFilter
				label={t('filters.versions')}
				options={availableVersions}
				selected={filters.versions}
				onChange={onVersionsChange}
				placeholder={t('filters.searchVersions')}
			/>

			{/* Category Filter */}
			<MultiSelectFilter
				label={t('filters.categories')}
				options={availableCategories}
				selected={filters.categories}
				onChange={onCategoriesChange}
				placeholder={t('filters.searchCategories')}
			/>

			{/* Reset Button */}
			<div className='pt-4 border-t'>
				<Button onClick={onReset} variant='outline' className='w-full'>
					<IconRefresh className='mr-2 h-4 w-4' />
					{t('filters.resetFilters')}
				</Button>
			</div>
		</div>
	)
}
