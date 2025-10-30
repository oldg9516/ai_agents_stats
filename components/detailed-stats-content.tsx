'use client'

import { useQuery } from '@tanstack/react-query'
import { useDashboardData } from '@/lib/hooks/use-dashboard-data'
import { useFilters } from '@/lib/hooks/use-filters'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import { DetailedStatsTable } from './tables/detailed-stats-table'
import { FilterSheet } from './filters/filter-sheet'
import { FilterBar } from './filters/filter-bar'
import { TableSkeleton } from './loading/table-skeleton'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'

/**
 * Detailed Stats Content - Client Component for detailed stats page
 *
 * Full-page table view with filters
 * Data fetching via React Query with caching
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

	// Fetch dashboard data (we only need detailedStats)
	const { data, isLoading, error } = useDashboardData(filters)

	// Fetch filter options (cached separately)
	const { data: filterOptions } = useQuery({
		queryKey: ['filterOptions'],
		queryFn: fetchFilterOptions,
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

	// Count active filters
	const getActiveFilterCount = () => {
		let count = 0

		// Check if date range is not default (last 30 days)
		const defaultFrom = new Date()
		defaultFrom.setDate(defaultFrom.getDate() - 30)
		const isDefaultDateRange =
			Math.abs(filters.dateRange.from.getTime() - defaultFrom.getTime()) <
			86400000 // 1 day tolerance

		if (!isDefaultDateRange) count++

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

	// Show loading state
	if (isLoading || !filterOptions) {
		return <TableSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<div className='flex flex-col items-center justify-center min-h-[400px] gap-4'>
				<div className='text-destructive text-lg font-semibold'>
					Error loading detailed stats
				</div>
				<div className='text-muted-foreground'>{error.message}</div>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Filter Button */}
			<div className='flex justify-start'>
				<FilterSheet
					title='Detailed Stats Filters'
					description='Customize your detailed stats view by filtering data across date ranges, versions, categories, and qualified agents.'
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

			{/* Detailed Stats Table */}
			{data.detailedStats.length > 0 && (
				<DetailedStatsTable data={data.detailedStats} />
			)}
		</div>
	)
}
