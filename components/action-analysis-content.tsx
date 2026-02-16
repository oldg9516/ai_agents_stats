'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { useActionAnalysisFilters } from '@/lib/store/hooks/use-action-analysis-filters'
import { useActionAnalysisData } from '@/lib/queries/action-analysis-queries'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import { KPICard } from '@/components/kpi/kpi-card'
import { DateRangeFilter } from '@/components/filters/date-range-filter'
import { FilterSheet } from '@/components/filters/filter-sheet'
import { FilterBarLayout } from '@/components/filters/filter-bar-layout'
import { MultiSelectFilter } from '@/components/filters/multi-select-filter'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	IconActivity,
	IconBolt,
	IconChecks,
	IconTarget,
} from '@tabler/icons-react'
import { useState } from 'react'

// Dynamic import for chart (bundle-dynamic-imports)
const ActionTypeAccuracyChart = dynamic(
	() => import('./charts/action-type-accuracy-chart').then(mod => ({ default: mod.ActionTypeAccuracyChart })),
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

// Dynamic import for table (bundle-dynamic-imports)
const CategoryAutomationTable = dynamic(
	() => import('./tables/action-analysis/category-automation-table').then(mod => ({ default: mod.CategoryAutomationTable })),
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
 * Action Analysis Content — main client component
 *
 * Layout:
 * 1. Date range + filter sheet (categories, versions)
 * 2. KPI cards (4): total, requires_action true/false, verified, accuracy
 * 3. Action Type Distribution chart
 * 4. Category breakdown table
 */
export function ActionAnalysisContent() {
	const t = useTranslations('actionAnalysis')
	const tCommon = useTranslations('common')
	const tFilters = useTranslations('filters')
	const {
		filters,
		setDateRange,
		setCategories,
		setVersions,
		resetFilters,
	} = useActionAnalysisFilters()

	const { data, isLoading, error } = useActionAnalysisData(filters)

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

	// Sync local state when sheet opens
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
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
					{[1, 2, 3, 4].map(i => (
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
						{t('noVerifiedData')}
					</CardContent>
				</Card>
			) : (
				<>
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
						<KPICard
							title={t('totalRecords')}
							value={data.totalRecords}
							icon={<IconChecks />}
							tooltipContent={t('tooltipTotalRecords')}
						/>
						<KPICard
							title={t('requiresAction')}
							value={data.requiresActionTrue}
							icon={<IconTarget />}
							description={`${t('true')}: ${data.requiresActionTrue} / ${t('false')}: ${data.requiresActionFalse}`}
							tooltipContent={t('tooltipRequiresAction')}
						/>
						<KPICard
							title={t('verified')}
							value={data.totalVerified}
							icon={<IconBolt />}
							tooltipContent={t('tooltipTotalVerified')}
						/>
						<KPICard
							title={t('overallAccuracy')}
							value={data.totalVerified > 0 ? `${((data.requiresActionAccuracy + data.actionTypeAccuracy) / 2).toFixed(1)}%` : '—'}
							icon={<IconActivity />}
							description={data.totalVerified > 0 ? `${t('requiresActionAccuracy')}: ${data.requiresActionAccuracy.toFixed(0)}% / ${t('actionTypeAccuracy')}: ${data.actionTypeAccuracy.toFixed(0)}%` : t('noVerifiedYet')}
							tooltipContent={t('tooltipOverall')}
						/>
					</div>

					{/* Action Type Distribution Chart */}
					{data.actionTypeDistribution.length > 0 && (
						<ActionTypeAccuracyChart data={data.actionTypeDistribution} />
					)}

					{/* Category Breakdown Table */}
					{data.categoryBreakdown.length > 0 && (
						<CategoryAutomationTable data={data.categoryBreakdown} />
					)}
				</>
			)}
		</div>
	)
}
