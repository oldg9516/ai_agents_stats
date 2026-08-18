'use client'

/**
 * Typical sentiment path by request position (spec §6.1)
 *
 * Only tickets with two or more requests take part — a single-request ticket says nothing
 * about how the mood moved. A dip at position 2 means the first reply routinely fails to
 * settle the question.
 */

import { memo, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { useTranslations } from 'next-intl'
import { ChartCardWithTooltip } from './chart-card-with-tooltip'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import type { SentimentTrajectoryPoint } from '@/lib/db/types'

interface SentimentTrajectoryChartProps {
	data: SentimentTrajectoryPoint[]
}

export const SentimentTrajectoryChart = memo(function SentimentTrajectoryChart({
	data,
}: SentimentTrajectoryChartProps) {
	const t = useTranslations('sentiment')

	const chartData = useMemo(
		() =>
			data.map(point => ({
				position:
					point.positionBucket >= 4
						? t('charts.trajectory.positionLast')
						: t('charts.trajectory.position', { n: point.positionBucket }),
				sentimentIndex: point.sentimentIndex,
				episodeCount: point.episodeCount,
			})),
		[data, t]
	)

	const chartConfig = {
		sentimentIndex: { label: t('kpi.index.title'), color: 'var(--chart-1)' },
	} satisfies ChartConfig

	return (
		<ChartCardWithTooltip
			title={t('charts.trajectory.title')}
			description={t('charts.trajectory.description')}
			tooltipContent={t('charts.trajectory.tooltip')}
		>
			{chartData.length === 0 ? (
				<p className='text-sm text-muted-foreground py-8 text-center'>{t('empty')}</p>
			) : (
				<ChartContainer config={chartConfig} className='h-[240px] w-full'>
					<LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis dataKey='position' tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
						<YAxis tickLine={false} axisLine={false} fontSize={11} width={44} />
						<ChartTooltip content={<ChartTooltipContent />} />
						<Line
							type='monotone'
							dataKey='sentimentIndex'
							stroke='var(--color-sentimentIndex)'
							strokeWidth={2}
							dot={{ r: 4 }}
						/>
					</LineChart>
				</ChartContainer>
			)}
			<div className='flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground'>
				{chartData.map(point => (
					<span key={point.position}>
						{point.position}: {point.episodeCount}
					</span>
				))}
			</div>
		</ChartCardWithTooltip>
	)
})
