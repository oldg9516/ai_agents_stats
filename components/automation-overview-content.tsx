'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { useAutomationOverviewFilters } from '@/lib/store/hooks/use-automation-overview-filters'
import { useAutomationOverviewData } from '@/lib/queries/automation-overview-queries'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import { KPICard } from '@/components/kpi/kpi-card'
import { DateRangeFilter } from '@/components/filters/date-range-filter'
import { FilterSheet } from '@/components/filters/filter-sheet'
import { FilterBarLayout } from '@/components/filters/filter-bar-layout'
import { MultiSelectFilter } from '@/components/filters/multi-select-filter'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	IconChecks,
	IconMailForward,
	IconFileText,
} from '@tabler/icons-react'
import { useState } from 'react'

// Dynamic import for chart
const AutomationDistributionChart = dynamic(
	() => import('./charts/automation-distribution-chart').then(mod => ({ default: mod.AutomationDistributionChart })),
	{
		loading: () => (
			<Card>
				<CardHeader><Skeleton className='h-6 w-48' /></CardHeader>
				<CardContent><Skeleton className='h-[300px] w-full' /></CardContent>
			</Card>
		),
		ssr: false,
	}
)

// Dynamic import for table
const AutomationOverviewTable = dynamic(
	() => import('./tables/automation-overview/automation-overview-table').then(mod => ({ default: mod.AutomationOverviewTable })),
	{
		loading: () => (
			<Card>
				<CardHeader><Skeleton className='h-6 w-48' /></CardHeader>
				<CardContent><Skeleton className='h-[400px] w-full' /></CardContent>
			</Card>
		),
		ssr: false,
	}
)

/**
 * Automation Overview Content — main client component
 *
 * Layout:
 * 1. Date range + filter sheet (categories, versions)
 * 2. KPI cards (3): total, auto-reply, draft
 * 3. Stacked bar chart — auto/draft by category
 * 4. Category breakdown table
 */
export function AutomationOverviewContent() {
	const t = useTranslations('automationOverview')
	const tCommon = useTranslations('common')
	const tFilters = useTranslations('filters')
	const {
		filters,
		setDateRange,
		setCategories,
		setVersions,
		resetFilters,
	} = useAutomationOverviewFilters()

	const { data, isLoading, error } = useAutomationOverviewData(filters)

	// Fetch filter options (cached separately)
	const { data: filterOptions } = useQuery({
		queryKey: ['filterOptions', {
			from: filters.dateRange.from.toISOString(),
			to: filters.dateRange.to.toISOString(),
		}],
		queryFn: () => fetchFilterOptions(filters.dateRange),
		staleTime: 5 * 60 * 1000,
	})

	// Local filter state for sheet (deferred apply)
	const [localCategories, setLocalCategories] = useState(filters.categories)
	const [localVersions, setLocalVersions] = useState(filters.versions)

	const handleApplyFilters = () => {
		setCategories(localCategories)
		setVersions(localVersions)
	}

	const handleResetFilters = () => {
		setLocalCategories([])
		setLocalVersions([])
		resetFilters()
	}

	const handleSheetOpenChange = (open: boolean) => {
		if (open) {
			setLocalCategories(filters.categories)
			setLocalVersions(filters.versions)
		}
	}

	const getActiveFilterCount = () => {
		let count = 0
		if (filterOptions) {
			if (filters.categories.length > 0 && filters.categories.length < filterOptions.categories.length) count++
			if (filters.versions.length > 0 && filters.versions.length < filterOptions.versions.length) count++
		}
		return count
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Date Range + Filters */}
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
				<div className='lg:order-1'>
					<FilterSheet
						title={t('title')}
						description={t('description')}
						activeFilterCount={getActiveFilterCount()}
						onOpenChange={handleSheetOpenChange}
					>
						{({ close }) => (
							<FilterBarLayout.Root>
								<FilterBarLayout.Fields>
									{filterOptions ? (
										<>
											<MultiSelectFilter
												label={tFilters('categories')}
												options={filterOptions.categories}
												selected={localCategories}
												onChange={setLocalCategories}
												searchable
											/>
											<MultiSelectFilter
												label={tFilters('versions')}
												options={filterOptions.versions}
												selected={localVersions}
												onChange={setLocalVersions}
											/>
										</>
									) : (
										<Skeleton className='h-24 w-full' />
									)}
								</FilterBarLayout.Fields>
								<FilterBarLayout.Actions
									onApply={() => {
										handleApplyFilters()
										close()
									}}
									onReset={handleResetFilters}
								/>
							</FilterBarLayout.Root>
						)}
					</FilterSheet>
				</div>
				<div className='lg:order-2 lg:flex-1'>
					<DateRangeFilter
						from={filters.dateRange.from}
						to={filters.dateRange.to}
						onChange={(from, to) => setDateRange(from, to)}
					/>
				</div>
			</div>

			{/* KPI Cards */}
			{isLoading ? (
				<div className='grid gap-4 md:grid-cols-3'>
					{[1, 2, 3].map(i => (
						<Card key={i}>
							<CardHeader className='pb-2'><Skeleton className='h-4 w-24' /></CardHeader>
							<CardContent><Skeleton className='h-8 w-16' /></CardContent>
						</Card>
					))}
				</div>
			) : error ? (
				<Card>
					<CardContent className='py-8 text-center text-muted-foreground'>
						{tCommon('error.fetchFailed')}
					</CardContent>
				</Card>
			) : !data || data.totalRecords === 0 ? (
				<Card>
					<CardContent className='py-8 text-center text-muted-foreground'>
						{t('noData')}
					</CardContent>
				</Card>
			) : (
				<>
					<div className='grid gap-4 md:grid-cols-3'>
						<KPICard
							title={t('totalTickets')}
							value={data.totalRecords}
							icon={<IconChecks />}
							tooltipContent={t('tooltipTotalTickets')}
						/>
						<KPICard
							title={t('autoReply')}
							value={data.autoReplyCount}
							icon={<IconMailForward />}
							description={`${data.autoReplyRate.toFixed(1)}%`}
							tooltipContent={t('tooltipAutoReply')}
						/>
						<KPICard
							title={t('draft')}
							value={data.draftCount}
							icon={<IconFileText />}
							description={`${data.totalRecords > 0 ? ((data.draftCount / data.totalRecords) * 100).toFixed(1) : 0}%`}
							tooltipContent={t('tooltipDraft')}
						/>
					</div>

					{/* Stacked Bar Chart */}
					{data.categoryBreakdown.length > 0 && (
						<AutomationDistributionChart data={data.categoryBreakdown} />
					)}

					{/* Category Breakdown Table */}
					{data.categoryBreakdown.length > 0 && (
						<AutomationOverviewTable data={data.categoryBreakdown} />
					)}
				</>
			)}
		</div>
	)
}
