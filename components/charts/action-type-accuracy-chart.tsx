'use client'

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
	type ChartConfig,
} from '@/components/ui/chart'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { ActionTypeDistItem } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

interface ActionTypeAccuracyChartProps {
	data: ActionTypeDistItem[]
}

const chartConfig: ChartConfig = {
	count: {
		label: 'Count',
		color: 'var(--chart-4)',
	},
}

/**
 * Action Type Distribution Chart
 *
 * Horizontal bar chart showing how many times AI predicted each action type.
 * Data from support_threads_data.action_analysis.action_type.
 */
export const ActionTypeAccuracyChart = memo(function ActionTypeAccuracyChart({
	data,
}: ActionTypeAccuracyChartProps) {
	const t = useTranslations('actionAnalysis')

	const chartData = useMemo(() =>
		data.map(item => ({
			actionType: item.actionType.replace(/_/g, ' '),
			count: item.count,
		})),
		[data]
	)

	if (chartData.length === 0) return null

	const chartHeight = Math.max(250, chartData.length * 35)

	return (
		<Card className='min-w-0'>
			<CardHeader>
				<div className='flex items-center gap-1.5'>
					<CardTitle className='text-lg sm:text-xl'>
						{t('actionTypeDistribution')}
					</CardTitle>
					<InfoTooltip content={t('tooltipActionType')} />
				</div>
				<CardDescription className='text-sm'>
					{t('chartDescription')}
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<ChartContainer config={chartConfig} className='w-full' style={{ height: chartHeight }}>
					<BarChart
						data={chartData}
						layout='vertical'
						margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
					>
						<CartesianGrid horizontal={false} strokeDasharray='3 3' />
						<XAxis type='number' tickLine={false} axisLine={false} />
						<YAxis
							type='category'
							dataKey='actionType'
							tickLine={false}
							axisLine={false}
							width={180}
							tick={{ fontSize: 12 }}
						/>
						<ChartTooltip
							cursor={false}
							content={({ active, payload }) => {
								if (!active || !payload?.length) return null
								const item = payload[0]?.payload
								if (!item) return null
								return (
									<div className='rounded-lg border bg-background p-3 shadow-md'>
										<p className='mb-1 font-medium'>{item.actionType}</p>
										<div className='text-sm'>
											<span className='text-muted-foreground'>{t('total')}: </span>
											<span className='font-medium'>{item.count}</span>
										</div>
									</div>
								)
							}}
						/>
						<Bar
							dataKey='count'
							fill={chartConfig.count.color}
							radius={[0, 4, 4, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
})
