'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { DateRangeFilter } from './date-range-filter'
import { MultiSelectFilter } from './multi-select-filter'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import type { DashboardFilters } from '@/lib/supabase/types'

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
	return (
		<Card>
			<CardContent className="pt-6">
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					{/* Date Range Filter */}
					<DateRangeFilter
						from={filters.dateRange.from}
						to={filters.dateRange.to}
						onChange={(from, to) => onFiltersChange({ dateRange: { from, to } })}
					/>

					{/* Version Filter */}
					<MultiSelectFilter
						label="Versions"
						options={availableVersions}
						selected={filters.versions}
						onChange={(versions) => onFiltersChange({ versions })}
						placeholder="Search versions..."
						allowEmpty={true}
					/>

					{/* Category Filter */}
					<MultiSelectFilter
						label="Categories"
						options={availableCategories}
						selected={filters.categories}
						onChange={(categories) => onFiltersChange({ categories })}
						placeholder="Search categories..."
						allowEmpty={true}
					/>

					{/* Agent Filter */}
					<MultiSelectFilter
						label="Qualified Agents"
						options={[...QUALIFIED_AGENTS]}
						selected={filters.agents}
						onChange={(agents) => onFiltersChange({ agents })}
						placeholder="Search agents..."
						searchable={true}
						allowEmpty={false} // At least one agent must be selected
					/>
				</div>

				{/* Reset Button */}
				<div className="mt-4 flex justify-end">
					<Button onClick={onReset} variant="outline" size="sm">
						<IconRefresh className="mr-2 h-4 w-4" />
						Reset Filters
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
