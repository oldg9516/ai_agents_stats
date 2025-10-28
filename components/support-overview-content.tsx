'use client'

import { useMemo } from 'react'
import { useSupportFilters } from '@/lib/hooks/use-support-filters'
import { useSupportData } from '@/lib/hooks/use-support-data'
import { SupportFilterSheet } from './filters/support-filter-sheet'
import { AIDraftCoverageCard } from './kpi/ai-draft-coverage-card'
import { ReplyRequiredCard } from './kpi/reply-required-card'
import { DataCollectionRateCard } from './kpi/data-collection-rate-card'
import { AvgRequirementsCard } from './kpi/avg-requirements-card'
import { StatusDistributionChart } from './charts/status-distribution-chart'
import { ResolutionTimeChart } from './charts/resolution-time-chart'
import { AIDraftFlowSankey } from './charts/ai-draft-flow-sankey'
import { RequirementsCorrelationHeatmap } from './charts/requirements-correlation-heatmap'
import { SupportThreadsTable } from './tables/support-threads-table'
import { SupportOverviewSkeleton } from './loading/support-overview-skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { IconAlertCircle } from '@tabler/icons-react'

/**
 * Support Overview Content - Main client component
 *
 * Features:
 * - Filters (date, status, request type, requirements, version)
 * - 4 KPI cards
 * - 4 charts (status pie, resolution bar, Sankey, heatmap)
 * - Support threads table with CSV export
 * - Real-time updates
 */
export function SupportOverviewContent() {
	const {
		filters,
		setDateRange,
		setStatuses,
		setRequestTypes,
		setRequirements,
		setVersions,
		resetFilters,
	} = useSupportFilters()

	const { data, isLoading, error } = useSupportData(filters)

	// Get available versions from threads
	const availableVersions = useMemo(() => {
		const versions = new Set<string>()
		data.threads.forEach((thread) => {
			if (thread.prompt_version) {
				versions.add(thread.prompt_version)
			}
		})
		return Array.from(versions).sort()
	}, [data.threads])

	// Show loading skeleton
	if (isLoading) {
		return <SupportOverviewSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<div className='flex min-h-screen items-center justify-center p-4'>
				<Card className='w-full max-w-md'>
					<CardHeader>
						<div className='flex items-center gap-2'>
							<IconAlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
							<CardTitle>Error Loading Data</CardTitle>
						</div>
						<CardDescription>Failed to load support overview data</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='rounded-md bg-red-50 dark:bg-red-900/20 p-3'>
							<p className='text-sm text-red-800 dark:text-red-200 font-mono'>
								{error.message}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Filter Button */}
			<div className='flex justify-start'>
				<SupportFilterSheet
					filters={filters}
					onDateRangeChange={setDateRange}
					onStatusesChange={setStatuses}
					onRequestTypesChange={setRequestTypes}
					onRequirementsChange={setRequirements}
					onVersionsChange={setVersions}
					onReset={resetFilters}
					availableVersions={availableVersions}
				/>
			</div>

			{/* KPI Cards */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<AIDraftCoverageCard data={data.kpis?.aiDraftCoverage || null} />
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

			{/* Support Threads Table */}
			<SupportThreadsTable data={data.threads} />
		</div>
	)
}
