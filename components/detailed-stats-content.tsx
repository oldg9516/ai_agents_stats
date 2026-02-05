'use client'

import { useQuery } from '@tanstack/react-query'
import { useFilters } from '@/lib/hooks/use-filters'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import { DetailedStatsTable } from './tables/detailed-stats-table'
import { FilterSheet } from './filters/filter-sheet'
import { FilterBar } from './filters/filter-bar'
import { DateRangeSelector } from './filters/date-range-selector'

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
		setHideRequiresEditing,
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

	// Handle date range change (immediate, used by date selector)
	const handleDateRangeChange = (updates: Partial<typeof filters>) => {
		if (updates.dateRange) {
			setDateRange(updates.dateRange.from, updates.dateRange.to)
		}
	}

	// Handle filter apply from sheet (deferred application)
	const handleApplyFilters = (updates: { versions: string[]; categories: string[]; agents: string[]; hideRequiresEditing: boolean }) => {
		setVersions(updates.versions)
		setCategories(updates.categories)
		setAgents(updates.agents)
		setHideRequiresEditing(updates.hideRequiresEditing)
	}

	// Count active filters (excluding date range, which has its own selector)
	const getActiveFilterCount = () => {
		let count = 0

		// Check if hideRequiresEditing is enabled
		if (filters.hideRequiresEditing) {
			count++
		}

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
			filterOptions &&
			(filters.agents?.length ?? 0) > 0 &&
			(filters.agents?.length ?? 0) < filterOptions.agents.length
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
						{({ close }) => (
							<FilterBar
								filters={filters}
								onApplyFilters={handleApplyFilters}
								onReset={resetFilters}
								availableVersions={[]}
								availableCategories={[]}
								availableAgents={[]}
								onClose={close}
							/>
						)}
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
						{({ close }) => (
							<FilterBar
								filters={filters}
								onApplyFilters={handleApplyFilters}
								onReset={resetFilters}
								availableVersions={filterOptions.versions}
								availableCategories={filterOptions.categories}
								availableAgents={filterOptions.agents}
								onClose={close}
							/>
						)}
					</FilterSheet>
				</div>

				{/* Date Range Selector - Fills remaining space on large screens */}
				<div className='lg:order-2 lg:flex-1'>
					<DateRangeSelector
						filters={filters}
						onFiltersChange={handleDateRangeChange}
					/>
				</div>
			</div>

			{/* Detailed Stats Table - handles its own data fetching with pagination */}
			<DetailedStatsTable filters={filters} />
		</div>
	)
}
