'use client'

import { usePaginatedThreads } from '@/lib/hooks/use-paginated-threads'
import { useSupportData } from '@/lib/hooks/use-support-data'
import { useSupportFilters } from '@/lib/hooks/use-support-filters'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { AIDraftFlowSankey } from './charts/ai-draft-flow-sankey'
import { RequirementsCorrelationHeatmap } from './charts/requirements-correlation-heatmap'
import { ResolutionTimeChart } from './charts/resolution-time-chart'
import { StatusDistributionChart } from './charts/status-distribution-chart'
import { FilterSheet } from './filters/filter-sheet'
import { SupportFilterBar } from './filters/support-filter-bar'
import { SupportDateRangeSelector } from './filters/support-date-range-selector'
import { AgentResponseRateCard } from './kpi/agent-response-rate-card'
import { AvgRequirementsCard } from './kpi/avg-requirements-card'
import { DataCollectionRateCard } from './kpi/data-collection-rate-card'
import { ReplyRequiredCard } from './kpi/reply-required-card'
import { SupportOverviewSkeleton } from './loading/support-overview-skeleton'
import { SupportThreadsTable } from './tables/support-threads-table'

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

	const {
		filters,
		setDateRange,
		setStatuses,
		setRequestTypes,
		setRequirements,
		setVersions,
		resetFilters,
	} = useSupportFilters()

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

		// Check if statuses are filtered
		if (filters.statuses.length > 0) count++

		// Check if request types are filtered
		if (filters.requestTypes.length > 0) count++

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
						<SupportFilterBar
							filters={filters}
							onStatusesChange={setStatuses}
							onRequestTypesChange={setRequestTypes}
							onRequirementsChange={setRequirements}
							onVersionsChange={setVersions}
							onReset={resetFilters}
							availableVersions={availableVersions}
						/>
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
				<AIDraftFlowSankey data={data.sankeyData} />
				<RequirementsCorrelationHeatmap data={data.correlationMatrix} />
			</div>

			{/* Support Threads Table with Pagination */}
			<SupportThreadsTable
				data={allLoadedThreads}
				hasMore={hasMore}
				isFetchingMore={isFetchingMore}
				onLoadMore={loadNextBatch}
			/>
		</div>
	)
}
