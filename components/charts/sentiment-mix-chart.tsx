'use client'

/**
 * Sentiment Mix — share of each category
 *
 * Donut for the latest period plus a stacked bar per period, so a shift inside the mix
 * is visible even when the overall index barely moves (spec §3.4, §13.4).
 */

import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { useTranslations } from 'next-intl'
import { ChartCardWithTooltip } from './chart-card-with-tooltip'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { SENTIMENT_CATEGORIES } from '@/constants/sentiment-categories'
import { formatPeriodLabel } from '@/lib/utils/sentiment-format'
import type { SentimentGranularity } from '@/constants/sentiment-categories'
import type { SentimentTimeseriesBucket } from '@/lib/db/types'

interface SentimentMixChartProps {
	data: SentimentTimeseriesBucket[]
	granularity: SentimentGranularity
}

export const SentimentMixChart = memo(function SentimentMixChart({
	data,
	granularity,
}: SentimentMixChartProps) {
	const t = useTranslations('sentiment')

	// Charts iterate the category config rather than naming the five values, so a new
	// category shows up here as soon as the AI starts using it (spec §12.1)
	const chartConfig = useMemo(
		() =>
			Object.fromEntries(
				SENTIMENT_CATEGORIES.map(category => [
					category.key,
					{ label: t(`categories.${category.key}`), color: `var(${category.colorVar})` },
				])
			) satisfies ChartConfig,
		[t]
	)

	const stackedData = useMemo(
		() =>
			data.map(bucket => {
				const row: Record<string, string | number> = {
					period: formatPeriodLabel(bucket.periodStart, granularity),
				}
				for (const category of SENTIMENT_CATEGORIES) {
					const count = bucket.distribution[category.key] ?? 0
					row[category.key] =
						bucket.episodeCount > 0 ? Number(((count / bucket.episodeCount) * 100).toFixed(1)) : 0
				}
				return row
			}),
		[data, granularity]
	)

	const latest = data.at(-1)
	const donutData = useMemo(() => {
		if (!latest) {
			return []
		}
		return SENTIMENT_CATEGORIES.map(category => ({
			name: t(`categories.${category.key}`),
			key: category.key,
			value: latest.distribution[category.key] ?? 0,
			fill: `var(${category.colorVar})`,
		})).filter(slice => slice.value > 0)
	}, [latest, t])

	return (
		<div className='grid gap-4 lg:grid-cols-3'>
			<ChartCardWithTooltip
				title={t('charts.mixDonut.title')}
				description={t('charts.mixDonut.description')}
				tooltipContent={t('charts.mixDonut.tooltip')}
			>
				{donutData.length === 0 ? (
					<p className='text-sm text-muted-foreground py-8 text-center'>{t('empty')}</p>
				) : (
					<ChartContainer config={chartConfig} className='h-[240px] w-full'>
						<PieChart>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Pie data={donutData} dataKey='value' nameKey='name' innerRadius={50} outerRadius={80}>
								{donutData.map(slice => (
									<Cell key={slice.key} fill={slice.fill} />
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
				)}
				<div className='flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs'>
					{donutData.map(slice => (
						<span key={slice.key} className='flex items-center gap-1.5'>
							<span
								className='h-2.5 w-2.5 rounded-sm'
								style={{ backgroundColor: slice.fill }}
							/>
							{slice.name}
							<span className='text-muted-foreground'>{slice.value}</span>
						</span>
					))}
				</div>
			</ChartCardWithTooltip>

			<ChartCardWithTooltip
				title={t('charts.mixStacked.title')}
				description={t('charts.mixStacked.description')}
				tooltipContent={t('charts.mixStacked.tooltip')}
				className='lg:col-span-2'
			>
				<ChartContainer config={chartConfig} className='h-[240px] w-full'>
					<BarChart data={stackedData} margin={{ left: 4, right: 4, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis dataKey='period' tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
						<YAxis tickLine={false} axisLine={false} fontSize={11} width={36} unit='%' />
						<ChartTooltip content={<ChartTooltipContent />} />
						{SENTIMENT_CATEGORIES.map(category => (
							<Bar
								key={category.key}
								dataKey={category.key}
								stackId='mix'
								fill={`var(${category.colorVar})`}
							/>
						))}
					</BarChart>
				</ChartContainer>
			</ChartCardWithTooltip>
		</div>
	)
})
