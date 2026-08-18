'use client'

/**
 * Sentiment Index trend
 *
 * Line of the weighted index per period with the request volume behind it, because an
 * index off 20 requests and one off 900 read very differently (spec §13.1).
 */

import { memo, useMemo } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { useTranslations } from 'next-intl'
import { ChartCardWithTooltip } from './chart-card-with-tooltip'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { formatPeriodLabel } from '@/lib/utils/sentiment-format'
import type { SentimentGranularity } from '@/constants/sentiment-categories'
import type { SentimentTimeseriesBucket } from '@/lib/db/types'

interface SentimentTrendChartProps {
	data: SentimentTimeseriesBucket[]
	granularity: SentimentGranularity
}

export const SentimentTrendChart = memo(function SentimentTrendChart({
	data,
	granularity,
}: SentimentTrendChartProps) {
	const t = useTranslations('sentiment')

	const chartData = useMemo(
		() =>
			data.map(bucket => ({
				period: formatPeriodLabel(bucket.periodStart, granularity),
				sentimentIndex: bucket.sentimentIndex,
				episodeCount: bucket.episodeCount,
			})),
		[data, granularity]
	)

	const chartConfig = {
		sentimentIndex: {
			label: t('kpi.index.title'),
			color: 'var(--chart-1)',
		},
		episodeCount: {
			label: t('heatmap.episodes'),
			color: 'var(--chart-3)',
		},
	} satisfies ChartConfig

	return (
		<ChartCardWithTooltip
			title={t('charts.trend.title')}
			description={t('charts.trend.description')}
			tooltipContent={t('charts.trend.tooltip')}
		>
			<ChartContainer config={chartConfig} className='h-[280px] w-full'>
				<ComposedChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey='period'
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						fontSize={11}
					/>
					<YAxis
						yAxisId='volume'
						orientation='right'
						tickLine={false}
						axisLine={false}
						fontSize={11}
						width={40}
					/>
					<YAxis
						yAxisId='index'
						tickLine={false}
						axisLine={false}
						fontSize={11}
						width={44}
						domain={[-2, 1]}
					/>
					<ChartTooltip content={<ChartTooltipContent />} />
					<Bar
						yAxisId='volume'
						dataKey='episodeCount'
						fill='var(--color-episodeCount)'
						opacity={0.25}
						radius={2}
					/>
					<Line
						yAxisId='index'
						type='monotone'
						dataKey='sentimentIndex'
						stroke='var(--color-sentimentIndex)'
						strokeWidth={2}
						dot={{ r: 3 }}
					/>
				</ComposedChart>
			</ChartContainer>
		</ChartCardWithTooltip>
	)
})
