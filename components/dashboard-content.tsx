'use client'

import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { useDashboardData } from '@/lib/hooks/use-dashboard-data'
import { useFilters } from '@/lib/hooks/use-filters'
import { getFilterOptions } from '@/lib/supabase/client-queries'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { CategoryPieChart } from './charts/category-pie-chart'
import { QualityTrendsChart } from './charts/quality-trends-chart'
import { VersionBarChart } from './charts/version-bar-chart'
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

	// Fetch filter options (cached separately)
	const { data: filterOptions } = useQuery({
		queryKey: ['filterOptions'],
		queryFn: getFilterOptions,
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
			{/* Filter Button */}
			<div className='flex justify-start'>
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

			{/* KPI Cards Section */}
			{data.kpi && <KPISection data={data.kpi} />}

			{/* Quality Trends Chart */}
			{data.qualityTrends.length > 0 && (
				<QualityTrendsChart data={data.qualityTrends} />
			)}

			{/* Category & Version Charts - Side by Side */}
			<div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 overflow-hidden'>
				{data.categoryDistribution.length > 0 && (
					<CategoryPieChart data={data.categoryDistribution} />
				)}

				{data.versionComparison.length > 0 && (
					<VersionBarChart data={data.versionComparison} />
				)}
			</div>

			{/* Detailed Stats Table */}
			{data.detailedStats.length > 0 && (
				<DetailedStatsTable data={data.detailedStats} />
			)}
		</div>
	)
}
