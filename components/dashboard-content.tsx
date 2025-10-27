'use client'

import { useEffect, useState } from 'react'
import { useDashboardData } from '@/lib/hooks/use-dashboard-data'
import { useFilters } from '@/lib/hooks/use-filters'
import { getFilterOptions } from '@/lib/supabase/queries'
import { KPISection } from './kpi/kpi-section'
import { KPISectionSkeleton } from './loading/kpi-skeleton'
import { QualityTrendsChart } from './charts/quality-trends-chart'
import { CategoryPieChart } from './charts/category-pie-chart'
import { VersionBarChart } from './charts/version-bar-chart'
import { DetailedStatsTable } from './tables/detailed-stats-table'
import { FilterSheet } from './filters/filter-sheet'
import { ChartSkeleton } from './loading/chart-skeleton'
import { TableSkeleton } from './loading/table-skeleton'
import type { FilterOptions } from '@/lib/supabase/types'

/**
 * Dashboard Content - Client Component
 *
 * Handles real-time data updates and interactivity
 * Wrapped in Suspense for progressive loading
 */
export function DashboardContent() {
	// Filter state with URL sync and localStorage
	const {
		filters,
		setDateRange,
		setVersions,
		setCategories,
		setAgents,
		resetFilters,
	} = useFilters()

	// Fetch dashboard data with current filters
	const { data, isLoading, error } = useDashboardData(filters)

	// Filter options (versions and categories)
	const [filterOptions, setFilterOptions] = useState<FilterOptions>({
		versions: [],
		categories: [],
	})

	// Load filter options on mount
	useEffect(() => {
		getFilterOptions().then(setFilterOptions).catch(console.error)
	}, [])

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

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center">
				<h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
					Error Loading Dashboard
				</h3>
				<p className="text-sm text-muted-foreground mt-2">{error.message}</p>
				<button
					onClick={() => window.location.reload()}
					className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
				>
					Retry
				</button>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
			{/* Filter Button */}
			<div className="flex justify-start">
				<FilterSheet
					filters={filters}
					onFiltersChange={handleFiltersChange}
					onReset={resetFilters}
					availableVersions={filterOptions.versions}
					availableCategories={filterOptions.categories}
				/>
			</div>

			{/* KPI Cards Section */}
			{isLoading || !data.kpi ? (
				<KPISectionSkeleton />
			) : (
				<KPISection data={data.kpi} />
			)}

			{/* Quality Trends Chart */}
			{isLoading || data.qualityTrends.length === 0 ? (
				<ChartSkeleton />
			) : (
				<QualityTrendsChart data={data.qualityTrends} />
			)}

			{/* Category & Version Charts - Side by Side */}
			<div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 overflow-hidden">
				{isLoading || data.categoryDistribution.length === 0 ? (
					<ChartSkeleton />
				) : (
					<CategoryPieChart data={data.categoryDistribution} />
				)}

				{isLoading || data.versionComparison.length === 0 ? (
					<ChartSkeleton />
				) : (
					<VersionBarChart data={data.versionComparison} />
				)}
			</div>

			{/* Detailed Stats Table */}
			{isLoading || data.detailedStats.length === 0 ? (
				<TableSkeleton />
			) : (
				<DetailedStatsTable data={data.detailedStats} />
			)}
		</div>
	)
}
