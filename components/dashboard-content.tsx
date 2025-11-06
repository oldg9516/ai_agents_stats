'use client'

import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import { useDashboardData } from '@/lib/hooks/use-dashboard-data'
import { useFilters } from '@/lib/hooks/use-filters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { CategoryPieChart } from './charts/category-pie-chart'
import { QualityTrendsChart } from './charts/quality-trends-chart'
import { VersionBarChart } from './charts/version-bar-chart'
import { DateRangeSelector } from './filters/date-range-selector'
import { FilterBar } from './filters/filter-bar'
import { FilterSheet } from './filters/filter-sheet'
import { KPISection } from './kpi/kpi-section'
import { SupportOverviewSkeleton } from './loading/support-overview-skeleton'
import { DetailedStatsTable } from './tables/detailed-stats-table'

/**
 * Dashboard Content - Client Component
 *
 * Handles interactivity, data fetching via React Query, and real-time updates
 * All data fetching is client-side with React Query caching
 */
export function DashboardContent() {
	const t = useTranslations()
	const queryClient = useQueryClient()

	// Filter state from Zustand store
	const {
		filters,
		setDateRange,
		setVersions,
		setCategories,
		setAgents,
		resetFilters,
	} = useFilters()

	// Fetch dashboard data with React Query
	const { data, isLoading, error } = useDashboardData(filters)

	// Fetch filter options based on current date range
	const { data: filterOptions } = useQuery({
		queryKey: [
			'filterOptions',
			filters.dateRange.from.toISOString(),
			filters.dateRange.to.toISOString(),
		],
		queryFn: () => fetchFilterOptions(filters.dateRange),
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	})

	// Handle filter changes with cache invalidation
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

		// Invalidate all dashboard queries to force refetch with new filters
		queryClient.invalidateQueries({ queryKey: ['dashboard'] })
		queryClient.invalidateQueries({ queryKey: ['detailed-stats-paginated'] })
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

	// Show loading state
	if (isLoading || !filterOptions) {
		return <SupportOverviewSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<div className='flex flex-col items-center justify-center min-h-[400px] gap-4'>
				<div className='text-destructive text-lg font-semibold'>
					{t('errors.loadingDashboard')}
				</div>
				<div className='text-muted-foreground'>{error.message}</div>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Date Range and Filters */}
			<div className='flex flex-col gap-4 lg:flex-row lg:items-center'>
				{/* More Filters Button - First on large screens, top on mobile */}
				<div className='lg:order-1'>
					<FilterSheet
						title={t('filterSheet.dashboardTitle')}
						description={t('filterSheet.dashboardDescription')}
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

			{/* KPI Cards Section */}
			{data.kpi && <KPISection data={data.kpi} />}

			{/* Quality Trends Chart */}
			{data.qualityTrends.length > 0 && (
				<QualityTrendsChart data={data.qualityTrends} />
			)}

			{/* Category & Version Charts - Side by Side */}
			<div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 overflow-hidden'>
				{data.categoryDistribution.categories.length > 0 && (
					<CategoryPieChart data={data.categoryDistribution} />
				)}

				{data.versionComparison.length > 0 && (
					<VersionBarChart data={data.versionComparison} />
				)}
			</div>

			{/* Detailed Stats Table */}
			<DetailedStatsTable filters={filters} />
		</div>
	)
}
