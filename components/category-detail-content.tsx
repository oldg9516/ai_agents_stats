'use client'

import { AgentQualityChart } from '@/components/category/agent-quality-chart'
import { CategoryRecordsTable } from '@/components/category/category-records-table'
import { VersionStatsTable } from '@/components/category/version-stats-table'
import { CategoryDetailFilters } from '@/components/filters/category-detail-filters'
import { KPICard } from '@/components/kpi/kpi-card'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { getCategoryLabel } from '@/constants/category-labels'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { fetchCategoryDetail } from '@/lib/actions/category-actions'
import type { CategoryDetailData, CategoryFilters } from '@/lib/supabase/types'
import {
	IconArrowLeft,
	IconExternalLink,
	IconMinus,
	IconTrendingDown,
	IconTrendingUp,
} from '@tabler/icons-react'
import { format, subDays } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

interface CategoryDetailContentProps {
	categoryName: string
	isModal?: boolean
	initialData?: CategoryDetailData
}

/**
 * Category Detail Content Component
 *
 * Main content for category detail page (shared between modal and full page)
 *
 * Sections:
 * 1. Header with back button and "Open in Full Page" (if modal)
 * 2. Filters (date range, versions, agents)
 * 3. KPIs (4 cards: total records, quality, changed, trend)
 * 4. Quality Trends Chart (line chart by week)
 * 5. Version Stats Table + Agent Quality Chart (side by side)
 * 6. Detailed Records Table (with pagination)
 */
export function CategoryDetailContent({
	categoryName,
	isModal = false,
	initialData,
}: CategoryDetailContentProps) {
	const router = useRouter()
	const t = useTranslations('category')
	const tCommon = useTranslations('common')

	// State
	const [data, setData] = useState<CategoryDetailData | null>(
		initialData || null
	)
	const [isLoading, setIsLoading] = useState(!initialData)
	const [filters, setFilters] = useState<CategoryFilters>({
		dateRange: {
			from: subDays(new Date(), 30),
			to: new Date(),
		},
		versions: [],
		agents: [...QUALIFIED_AGENTS],
	})
	const [page, setPage] = useState(0)
	const pageSize = 20

	// Fetch data when filters change
	useEffect(() => {
		const loadData = async () => {
			setIsLoading(true)
			try {
				const result = await fetchCategoryDetail(categoryName, filters, {
					page,
					pageSize,
				})
				setData(result)
			} catch (error) {
				console.error('Error loading category data:', error)
				toast.error(t('errors.loadFailed'))
			} finally {
				setIsLoading(false)
			}
		}

		loadData()
	}, [categoryName, filters, page, pageSize, t])

	// Reset filters
	const handleResetFilters = () => {
		setFilters({
			dateRange: {
				from: subDays(new Date(), 30),
				to: new Date(),
			},
			versions: [],
			agents: [...QUALIFIED_AGENTS],
		})
		setPage(0)
	}

	// Export CSV
	const handleExport = () => {
		toast.info(t('export.comingSoon'))
		// TODO: Implement CSV export
	}

	// Back navigation
	const handleBack = () => {
		router.back()
	}

	// Get available versions from data
	const availableVersions = data?.versionStats.map(v => v.version) || []

	// Chart config for trends
	const chartConfig: ChartConfig = {
		quality: {
			label: t('charts.quality'),
			color: 'var(--chart-1)',
		},
	}

	// Transform weekly trends for chart
	const chartData =
		data?.weeklyTrends.map(trend => ({
			week: format(new Date(trend.weekStart), 'MMM dd'),
			quality: Number(trend.goodPercentage.toFixed(1)),
			records: trend.totalRecords,
		})) || []

	// Loading state
	if (isLoading && !data) {
		return (
			<div className='space-y-6 p-6'>
				<div className='animate-pulse space-y-4'>
					<div className='h-8 bg-muted rounded w-1/3' />
					<div className='h-32 bg-muted rounded' />
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
						<div className='h-32 bg-muted rounded' />
						<div className='h-32 bg-muted rounded' />
						<div className='h-32 bg-muted rounded' />
						<div className='h-32 bg-muted rounded' />
					</div>
				</div>
			</div>
		)
	}

	if (!data) {
		return (
			<div className='flex items-center justify-center min-h-[400px]'>
				<p className='text-muted-foreground'>{t('errors.noData')}</p>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
				<div className='flex items-center gap-3'>
					{!isModal && (
						<Button variant='ghost' size='icon' onClick={handleBack}>
							<IconArrowLeft className='h-5 w-5' />
							<span className='sr-only'>{tCommon('back')}</span>
						</Button>
					)}
					<div>
						<h1 className='text-2xl font-bold tracking-tight'>
							{getCategoryLabel(categoryName)}
						</h1>
						<p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
					</div>
				</div>

				{isModal && (
					<Button variant='outline' size='sm' asChild>
						<a
							href={`/dashboard/category/${encodeURIComponent(categoryName)}`}
							target='_blank'
							rel='noopener noreferrer'
						>
							<IconExternalLink className='h-4 w-4 mr-2' />
							{t('openInFullPage')}
						</a>
					</Button>
				)}
			</div>

			{/* Filters */}
			<CategoryDetailFilters
				filters={filters}
				availableVersions={availableVersions}
				onFiltersChange={setFilters}
				onReset={handleResetFilters}
			/>

			{/* KPIs */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<KPICard
					title={t('kpis.totalRecords')}
					value={data.kpis.totalRecords.current}
					trend={data.kpis.totalRecords.trend}
					description={t('kpis.totalRecordsDesc')}
				/>
				<KPICard
					title={t('kpis.quality')}
					value={`${data.kpis.quality.current.toFixed(1)}%`}
					trend={data.kpis.quality.trend}
					description={t('kpis.qualityDesc')}
				/>
				<KPICard
					title={t('kpis.changed')}
					value={data.kpis.changed.current}
					trend={data.kpis.changed.trend}
					description={t('kpis.changedDesc')}
				/>
				<KPICard
					title={t('kpis.trend')}
					value={`${
						data.kpis.quality.trend.direction === 'up'
							? '+'
							: data.kpis.quality.trend.direction === 'down'
							? '-'
							: ''
					}${data.kpis.quality.trend.percentage.toFixed(1)}%`}
					icon={
						data.kpis.quality.trend.direction === 'up' ? (
							<IconTrendingUp className='h-4 w-4' />
						) : data.kpis.quality.trend.direction === 'down' ? (
							<IconTrendingDown className='h-4 w-4' />
						) : (
							<IconMinus className='h-4 w-4' />
						)
					}
					description={t('kpis.trendDesc')}
				/>
			</div>

			{/* Quality Trends Chart */}
			{chartData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className='text-base sm:text-lg'>
							{t('charts.qualityTrends')}
						</CardTitle>
						<CardDescription className='text-xs sm:text-sm'>
							{t('charts.qualityTrendsDesc')}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className='h-[300px] w-full'>
							<LineChart data={chartData}>
								<CartesianGrid strokeDasharray='3 3' vertical={false} />
								<XAxis
									dataKey='week'
									tickLine={false}
									axisLine={false}
									tickMargin={8}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									domain={[0, 100]}
									tickFormatter={value => `${value}%`}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											hideLabel
											formatter={(value, name, item) => (
												<div className='flex flex-col gap-1'>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-muted-foreground'>
															{t('charts.week')}:
														</span>
														<span className='font-medium'>
															{item.payload.week}
														</span>
													</div>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-muted-foreground'>
															{t('charts.quality')}:
														</span>
														<span className='font-medium'>{value}%</span>
													</div>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-muted-foreground'>
															{t('charts.records')}:
														</span>
														<span className='font-medium'>
															{item.payload.records}
														</span>
													</div>
												</div>
											)}
										/>
									}
								/>
								<Line
									type='monotone'
									dataKey='quality'
									stroke='var(--color-quality)'
									strokeWidth={2}
									dot={{ fill: 'var(--color-quality)', r: 4 }}
									activeDot={{ r: 6 }}
								/>
							</LineChart>
						</ChartContainer>
					</CardContent>
				</Card>
			)}

			{/* Version Stats + Agent Quality Grid */}
			<div className='grid gap-6 lg:grid-cols-2'>
				<VersionStatsTable data={data.versionStats} />
				<AgentQualityChart data={data.agentStats} />
			</div>

			{/* Detailed Records Table */}
			<CategoryRecordsTable
				data={data.records.data}
				total={data.records.total}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onExport={handleExport}
			/>
		</div>
	)
}
