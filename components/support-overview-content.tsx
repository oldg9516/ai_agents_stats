'use client'

import { usePaginatedThreads } from '@/lib/hooks/use-paginated-threads'
import { useSupportData } from '@/lib/hooks/use-support-data'
import { useSupportFilters } from '@/lib/hooks/use-support-filters'
import { useAvailableCategories } from '@/lib/queries/support-queries'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { FilterSheet } from './filters/filter-sheet'
import { SupportDateRangeSelector } from './filters/support-date-range-selector'
import { SupportFilterBar } from './filters/support-filter-bar'
import { AgentResponseRateCard } from './kpi/agent-response-rate-card'
import { AvgRequirementsCard } from './kpi/avg-requirements-card'
import { DataCollectionRateCard } from './kpi/data-collection-rate-card'
import { ReplyRequiredCard } from './kpi/reply-required-card'
import { ChartSkeleton } from './loading/chart-skeleton'
import { SupportOverviewSkeleton } from './loading/support-overview-skeleton'
import { SupportThreadsTable } from './tables/support-threads-table'

// Dynamic imports for heavy chart components to reduce initial bundle size
const ResolutionTimeChart = dynamic(
	() => import('./charts/resolution-time-chart').then(mod => ({ default: mod.ResolutionTimeChart })),
	{ loading: () => <ChartSkeleton />, ssr: false }
)

const StatusDistributionChart = dynamic(
	() => import('./charts/status-distribution-chart').then(mod => ({ default: mod.StatusDistributionChart })),
	{ loading: () => <ChartSkeleton />, ssr: false }
)

/**
 * Support Overview Content - Client Component
 *
 * Features:
 * - Filters (date, status, request type, requirements, version)
 * - 4 KPI cards
 * - 4 charts (status pie, resolution bar, Sankey, heatmap)
 * - Support threads table with paginated loading (60 records per batch)
 * - Data fetching via React Query with caching
 */
export function SupportOverviewContent() {
	const t = useTranslations()

	const supportFiltersHook = useSupportFilters()
	const {
		filters,
		setDateRange,
		resetFilters,
	} = supportFiltersHook

	// applyFilters may be undefined if hook is not ready yet
	const applyFilters = supportFiltersHook.applyFilters ?? (() => {
		console.warn('[SupportOverviewContent] applyFilters is not available yet')
	})

	// Fetch support data with React Query (KPIs and charts)
	const { data, isLoading, error } = useSupportData(filters)

	// Fetch paginated threads (60 records per batch, cached in session)
	const {
		allLoadedThreads,
		hasMore,
		isLoadingInitial,
		isFetchingMore,
		loadNextBatch,
	} = usePaginatedThreads()

	// Fetch all available categories from database (sorted: single first, then multi)
	const { data: availableCategories } = useAvailableCategories(filters.dateRange)

	// Calculate available versions from paginated threads
	const availableVersions = useMemo(() => {
		if (!allLoadedThreads.length) return []
		return Array.from(
			new Set(allLoadedThreads.map(t => t.prompt_version).filter(Boolean))
		).sort() as string[]
	}, [allLoadedThreads])

	// Count active filters (excluding date range, which has its own selector)
	const getActiveFilterCount = () => {
		let count = 0

		// Check if pending drafts only is enabled
		if (filters.pendingDraftsOnly) count++

		// Check if statuses are filtered
		if (filters.statuses.length > 0) count++

		// Check if request types are filtered
		if (filters.requestTypes.length > 0) count++

		// Check if categories are filtered
		if (filters.categories.length > 0) count++

		// Check if requirements are filtered
		if (filters.requirements.length > 0) count++

		// Check if versions are filtered
		if (
			filters.versions.length > 0 &&
			filters.versions.length < availableVersions.length
		) {
			count++
		}

		return count
	}

	// Show loading state (wait for both KPIs/charts AND initial threads)
	if (isLoading || isLoadingInitial) {
		return <SupportOverviewSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<div className='flex flex-col items-center justify-center min-h-[400px] gap-4'>
				<div className='text-destructive text-lg font-semibold'>
					{t('errors.loadingSupport')}
				</div>
				<div className='text-muted-foreground'>{error.message}</div>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Filters Section */}
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
				{/* More Filters Button - First on large screens, top on mobile */}
				<div className='lg:order-1'>
					<FilterSheet
						title={t('filterSheet.supportTitle')}
						description={t('filterSheet.supportDescription')}
						activeFilterCount={getActiveFilterCount()}
					>
						{({ close }) => (
							<SupportFilterBar
								filters={filters}
								onApplyFilters={applyFilters}
								onReset={resetFilters}
								availableVersions={availableVersions}
								availableCategories={availableCategories}
								onClose={close}
							/>
						)}
					</FilterSheet>
				</div>

				{/* Date Range Selector - Fills remaining space on large screens */}
				<div className='lg:order-2 lg:flex-1'>
					<SupportDateRangeSelector
						from={filters.dateRange.from}
						to={filters.dateRange.to}
						onDateRangeChange={setDateRange}
					/>
				</div>
			</div>

			{/* KPI Cards */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<AgentResponseRateCard data={data.kpis?.agentResponseRate || null} />
				<ReplyRequiredCard data={data.kpis?.replyRequired || null} />
				<DataCollectionRateCard data={data.kpis?.dataCollectionRate || null} />
				<AvgRequirementsCard data={data.kpis?.avgRequirements || null} />
			</div>

			{/* Charts Grid */}
			<div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 overflow-hidden'>
				<StatusDistributionChart data={data.statusDistribution} />
				<ResolutionTimeChart data={data.resolutionTime} />
				{/* <AIDraftFlowSankey data={data.sankeyData} /> */}
				{/* <RequirementsCorrelationHeatmap data={data.correlationMatrix} /> */}
			</div>

			{/* Support Threads Table with Pagination */}
			<SupportThreadsTable
				data={allLoadedThreads}
				filters={filters}
				hasMore={hasMore}
				isFetchingMore={isFetchingMore}
				onLoadMore={loadNextBatch}
			/>
		</div>
	)
}
