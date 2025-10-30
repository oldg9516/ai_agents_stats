'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import type { ResolutionTimeData } from '@/lib/supabase/types'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'

interface ResolutionTimeChartProps {
	data: ResolutionTimeData[]
}

/**
 * Resolution Time Chart - Bar chart showing avg resolution time by week
 *
 * Features:
 * - Bar chart with time values
 * - Shows average hours to resolution
 * - Grouped by week
 */
export function ResolutionTimeChart({ data }: ResolutionTimeChartProps) {
	const t = useTranslations()

	// Transform and sort data
	const chartData = useMemo(() => {
		return data
			.map((item) => ({
				week: format(new Date(item.weekStart), 'MMM dd'),
				avgTime: item.avgResolutionTime,
				count: item.threadCount,
			}))
			.sort((a, b) => a.week.localeCompare(b.week))
	}, [data])

	const chartConfig: ChartConfig = {
		avgTime: {
			label: t('charts.resolutionTime.avgTime'),
			color: 'var(--chart-1)',
		},
	}

	if (chartData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>{t('charts.resolutionTime.title')}</CardTitle>
					<CardDescription className='text-sm'>
						{t('charts.resolutionTime.description')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center justify-center h-[250px] text-sm text-muted-foreground'>
						{t('common.noDataAvailable')}
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className='min-w-0'>
			<CardHeader>
				<div className='flex items-center gap-1.5'>
					<CardTitle className='text-lg sm:text-xl'>{t('charts.resolutionTime.title')}</CardTitle>
					<InfoTooltip content={t('charts.resolutionTime.tooltip')} />
				</div>
				<CardDescription className='text-sm'>
					{t('charts.resolutionTime.description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<ChartContainer config={chartConfig} className='h-[300px] w-full'>
					<BarChart
						data={chartData}
						margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
					>
						<CartesianGrid vertical={false} strokeDasharray='3 3' />
						<XAxis
							dataKey='week'
							tickLine={false}
							tickMargin={10}
							axisLine={false}
						/>
						<YAxis
							tickLine={false}
							tickMargin={5}
							axisLine={false}
							tickFormatter={(value) => `${value}h`}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name, item) => (
										<div className='flex flex-col gap-1'>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>{t('charts.resolutionTime.week')}:</span>
												<span className='font-medium'>{item.payload.week}</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>{t('charts.resolutionTime.avgTime')}:</span>
												<span className='font-medium'>{value}h</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>{t('charts.resolutionTime.threads')}:</span>
												<span className='font-medium'>{item.payload.count}</span>
											</div>
										</div>
									)}
								/>
							}
						/>
						<Bar
							dataKey='avgTime'
							fill='var(--color-avgTime)'
							radius={[8, 8, 0, 0]}
						>
							<LabelList
								dataKey='avgTime'
								position='top'
								offset={8}
								className='fill-foreground text-xs font-medium'
								formatter={(value: number) => `${value.toFixed(1)}h`}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
