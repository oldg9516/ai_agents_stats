'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useSupportData } from '@/lib/hooks/use-support-data'
import { useSupportFilters } from '@/lib/hooks/use-support-filters'
import { FilterSheet } from './filters/filter-sheet'
import { SupportFilterBar } from './filters/support-filter-bar'
import { AgentResponseRateCard } from './kpi/agent-response-rate-card'
import { ReplyRequiredCard } from './kpi/reply-required-card'
import { DataCollectionRateCard } from './kpi/data-collection-rate-card'
import { AvgRequirementsCard } from './kpi/avg-requirements-card'
import { StatusDistributionChart } from './charts/status-distribution-chart'
import { ResolutionTimeChart } from './charts/resolution-time-chart'
import { AIDraftFlowSankey } from './charts/ai-draft-flow-sankey'
import { RequirementsCorrelationHeatmap } from './charts/requirements-correlation-heatmap'
import { SupportThreadsTable } from './tables/support-threads-table'
import { SupportOverviewSkeleton } from './loading/support-overview-skeleton'

/**
 * Support Overview Content - Client Component
 *
 * Features:
 * - Filters (date, status, request type, requirements, version)
 * - 4 KPI cards
 * - 4 charts (status pie, resolution bar, Sankey, heatmap)
 * - Support threads table with CSV export
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

	// Fetch support data with React Query
	const { data, isLoading, error } = useSupportData(filters)

	// Calculate available versions from threads
	const availableVersions = useMemo(() => {
		if (!data.threads.length) return []
		return Array.from(
			new Set(data.threads.map(t => t.prompt_version).filter(Boolean))
		).sort() as string[]
	}, [data.threads])

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

	// Show loading state
	if (isLoading) {
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
			{/* Filter Button */}
			<div className='flex justify-start'>
				<FilterSheet
					title={t('filterSheet.supportTitle')}
					description={t('filterSheet.supportDescription')}
					activeFilterCount={getActiveFilterCount()}
				>
					<SupportFilterBar
						filters={filters}
						onDateRangeChange={setDateRange}
						onStatusesChange={setStatuses}
						onRequestTypesChange={setRequestTypes}
						onRequirementsChange={setRequirements}
						onVersionsChange={setVersions}
						onReset={resetFilters}
						availableVersions={availableVersions}
					/>
				</FilterSheet>
			</div>

			{/* KPI Cards */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<AgentResponseRateCard data={data.kpis?.agentResponseRate || null} />
				<ReplyRequiredCard data={data.kpis?.replyRequired || null} />
				<DataCollectionRateCard
					data={data.kpis?.dataCollectionRate || null}
				/>
				<AvgRequirementsCard data={data.kpis?.avgRequirements || null} />
			</div>

			{/* Charts Grid */}
			<div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 overflow-hidden'>
				<StatusDistributionChart data={data.statusDistribution} />
				<ResolutionTimeChart data={data.resolutionTime} />
				<AIDraftFlowSankey data={data.sankeyData} />
				<RequirementsCorrelationHeatmap data={data.correlationMatrix} />
			</div>

			{/* Support Threads Table */}
			<SupportThreadsTable data={data.threads} />
		</div>
	)
}
