'use client'

/**
 * AI Sentiment Analytics page
 *
 * Every number on this page is computed by the get_sentiment_* RPC functions; the page
 * picks a period and a granularity and renders what comes back (spec §8.4).
 */

import { useTranslations } from 'next-intl'
import { DateRangeFilter } from '@/components/filters/date-range-filter'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { SentimentKpiCards } from '@/components/kpi/sentiment-kpi-cards'
import { SentimentTrendChart } from '@/components/charts/sentiment-trend-chart'
import { SentimentMixChart } from '@/components/charts/sentiment-mix-chart'
import { SentimentBreakdownHeatmap } from '@/components/charts/sentiment-breakdown-heatmap'
import { SentimentTrajectoryChart } from '@/components/charts/sentiment-trajectory-chart'
import { SentimentPatternChart } from '@/components/charts/sentiment-pattern-chart'
import { SentimentAgentsTable } from '@/components/tables/sentiment-agents-table'
import { useSentimentFilters } from '@/lib/store/hooks'
import {
	useSentimentAgentQuality,
	useSentimentBreakdown,
	useSentimentPatterns,
	useSentimentTimeseries,
	useSentimentTrajectory,
} from '@/lib/queries/sentiment-queries'
import {
	SENTIMENT_DATA_AVAILABLE_FROM,
	SENTIMENT_GRANULARITIES,
	TENURE_RISK_BUCKETS,
	type SentimentGranularity,
} from '@/constants/sentiment-categories'
import { getCategoryLabel } from '@/constants/category-labels'

export function SentimentContent() {
	const t = useTranslations('sentiment')
	const { filters, setDateRange, setGranularity } = useSentimentFilters()

	const timeseries = useSentimentTimeseries(filters)
	const subcategory = useSentimentBreakdown(filters, 'subcategory')
	const tenure = useSentimentBreakdown(filters, 'tenure')
	const weekday = useSentimentBreakdown(filters, 'weekday')
	const trajectory = useSentimentTrajectory(filters)
	const patterns = useSentimentPatterns(filters)
	const agents = useSentimentAgentQuality(filters)

	const buckets = timeseries.data ?? []

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Header */}
			<div>
				<h1 className='text-2xl font-semibold'>{t('title')}</h1>
				<p className='text-sm text-muted-foreground mt-1'>{t('description')}</p>
				{/* Spec §11.3: an empty bucket must never read as "customers were neutral" */}
				<p className='text-xs text-muted-foreground mt-1'>
					{t('dataAvailableFrom', { date: SENTIMENT_DATA_AVAILABLE_FROM })}
				</p>
			</div>

			{/* Period and granularity */}
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap'>
				<div className='lg:flex-1 lg:min-w-[280px]'>
					<DateRangeFilter
						from={filters.dateRange.from}
						to={filters.dateRange.to}
						onChange={setDateRange}
					/>
				</div>
				<ToggleGroup
					type='single'
					value={filters.granularity}
					onValueChange={value => value && setGranularity(value as SentimentGranularity)}
					variant='outline'
					size='sm'
				>
					{SENTIMENT_GRANULARITIES.map(granularity => (
						<ToggleGroupItem key={granularity} value={granularity}>
							{t(`granularity.${granularity}`)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>

			{timeseries.isError && (
				<Card>
					<CardContent className='py-6 text-sm text-destructive'>
						{timeseries.error instanceof Error ? timeseries.error.message : t('empty')}
					</CardContent>
				</Card>
			)}

			{timeseries.isLoading ? (
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className='h-[120px] w-full' />
					))}
				</div>
			) : (
				<SentimentKpiCards data={buckets} />
			)}

			{timeseries.isLoading ? (
				<Skeleton className='h-[340px] w-full' />
			) : (
				<SentimentTrendChart data={buckets} granularity={filters.granularity} />
			)}

			{timeseries.isLoading ? (
				<Skeleton className='h-[320px] w-full' />
			) : (
				<SentimentMixChart data={buckets} granularity={filters.granularity} />
			)}

			{/* Subcategory × severity (spec §4) */}
			{subcategory.isLoading ? (
				<Skeleton className='h-[400px] w-full' />
			) : (
				<SentimentBreakdownHeatmap
					title={t('charts.subcategory.title')}
					description={t('charts.subcategory.description')}
					tooltipContent={t('charts.subcategory.tooltip')}
					rows={(subcategory.data ?? [])
						.slice()
						.sort((a, b) => b.severityShare - a.severityShare)}
					renderBucketLabel={key =>
						key === 'unknown' ? t('unknownBucket') : getCategoryLabel(key)
					}
					minEpisodes={10}
					emptyLabel={t('empty')}
				/>
			)}

			<div className='grid gap-4 lg:grid-cols-2'>
				{/* Tenure × sentiment (spec §5) */}
				{tenure.isLoading ? (
					<Skeleton className='h-[320px] w-full' />
				) : (
					<SentimentBreakdownHeatmap
						title={t('charts.tenure.title')}
						description={t('charts.tenure.description')}
						tooltipContent={t('charts.tenure.tooltip')}
						rows={tenure.data ?? []}
						renderBucketLabel={key =>
							key === 'unknown'
								? t('charts.tenure.unknown')
								: TENURE_RISK_BUCKETS.includes(key)
									? t('charts.tenure.riskBucket', { bucket: key })
									: t('charts.tenure.bucket', { bucket: key })
						}
						emptyLabel={t('empty')}
					/>
				)}

				{/* Weekday × sentiment (spec §7) */}
				{weekday.isLoading ? (
					<Skeleton className='h-[320px] w-full' />
				) : (
					<SentimentBreakdownHeatmap
						title={t('charts.weekday.title')}
						description={t('charts.weekday.description')}
						tooltipContent={t('charts.weekday.tooltip')}
						rows={weekday.data ?? []}
						renderBucketLabel={key => t(`weekdays.${key}`)}
						emptyLabel={t('empty')}
					/>
				)}
			</div>

			{/* Inside-ticket dynamics (spec §6) */}
			<div className='grid gap-4 lg:grid-cols-2'>
				{trajectory.isLoading ? (
					<Skeleton className='h-[320px] w-full' />
				) : (
					<SentimentTrajectoryChart data={trajectory.data ?? []} />
				)}
				{patterns.isLoading ? (
					<Skeleton className='h-[320px] w-full' />
				) : (
					<SentimentPatternChart data={patterns.data ?? []} />
				)}
			</div>

			{/* Agent attribution (spec §3.5) */}
			{agents.isLoading ? (
				<Skeleton className='h-[320px] w-full' />
			) : (
				<SentimentAgentsTable data={agents.data ?? []} />
			)}
		</div>
	)
}
