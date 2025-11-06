'use client'

import { useQuery } from '@tanstack/react-query'
import { useFilters } from '@/lib/hooks/use-filters'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import { DetailedStatsTable } from './tables/detailed-stats-table'
import { FilterSheet } from './filters/filter-sheet'
import { FilterBar } from './filters/filter-bar'
import { DateRangeSelector } from './filters/date-range-selector'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'

/**
 * Detailed Stats Content - Client Component for detailed stats page
 *
 * OPTIMIZED: Uses server-side pagination via DetailedStatsTable
 * This page only shows the table (no KPIs or charts)
 * Table component handles its own data fetching with pagination (50 rows per page)
 */
export function DetailedStatsContent() {
	// Filter state from Zustand store
	const {
		filters,
		setDateRange,
		setVersions,
		setCategories,
		setAgents,
		resetFilters,
	} = useFilters()

	// Fetch filter options (cached separately) - depends on date range
	const { data: filterOptions, isLoading: isLoadingOptions } = useQuery({
		queryKey: ['filterOptions', {
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
		}],
		queryFn: () => fetchFilterOptions(filters.dateRange),
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	})

	// Handle filter changes
	const handleFiltersChange = (updates: Partial<typeof filters>) => {
		if (updates.dateRange) {
			setDateRange(updates.dateRange.from, updates.dateRange.to)
		}
		if (updates.versions !== undefined) {
			setVersions(updates.versions)
		}
		if (updates.categories !== undefined) {
			setCategories(updates.categories)
		}
		if (updates.agents !== undefined) {
			setAgents(updates.agents)
		}
	}

	// Count active filters (excluding date range, which has its own selector)
	const getActiveFilterCount = () => {
		let count = 0

		// Check if versions are filtered
		if (
			filterOptions &&
			filters.versions.length > 0 &&
			filters.versions.length < filterOptions.versions.length
		) {
			count++
		}

		// Check if categories are filtered
		if (
			filterOptions &&
			filters.categories.length > 0 &&
			filters.categories.length < filterOptions.categories.length
		) {
			count++
		}

		// Check if agents are filtered
		if (
			filters.agents.length > 0 &&
			filters.agents.length < QUALIFIED_AGENTS.length
		) {
			count++
		}

		return count
	}

	// Show loading state only for filter options
	if (isLoadingOptions || !filterOptions) {
		return (
			<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
				<div className='flex justify-start'>
					<FilterSheet
						title='Detailed Stats Filters'
						description='Customize your detailed stats view by filtering data across date ranges, versions, categories, and qualified agents.'
						activeFilterCount={0}
					>
						<FilterBar
							filters={filters}
							onFiltersChange={handleFiltersChange}
							onReset={resetFilters}
							availableVersions={[]}
							availableCategories={[]}
						/>
					</FilterSheet>
				</div>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Date Range and Filters */}
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
				{/* More Filters Button - First on large screens, top on mobile */}
				<div className='lg:order-1'>
					<FilterSheet
						title='More Filters'
						description='Customize your detailed stats view by filtering data across versions, categories, and qualified agents.'
						activeFilterCount={getActiveFilterCount()}
					>
						<FilterBar
							filters={filters}
							onFiltersChange={handleFiltersChange}
							onReset={resetFilters}
							availableVersions={filterOptions.versions}
							availableCategories={filterOptions.categories}
						/>
					</FilterSheet>
				</div>

				{/* Date Range Selector - Fills remaining space on large screens */}
				<div className='lg:order-2 lg:flex-1'>
					<DateRangeSelector
						filters={filters}
						onFiltersChange={handleFiltersChange}
					/>
				</div>
			</div>

			{/* Detailed Stats Table - handles its own data fetching with pagination */}
			<DetailedStatsTable filters={filters} />
		</div>
	)
}
