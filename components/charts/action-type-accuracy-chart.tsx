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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts'

interface ActionTypeAccuracyChartProps {
	data: ActionTypeDistItem[]
}

const chartConfig: ChartConfig = {
	correct: {
		label: 'Correct',
		color: 'var(--chart-7)',
	},
	incorrect: {
		label: 'Incorrect',
		color: 'var(--chart-4)',
	},
}

/**
 * Action Type Accuracy Chart
 *
 * Stacked horizontal bar chart showing per action type:
 * - Green portion: agent confirmed (correct)
 * - Red portion: agent corrected (incorrect)
 * - Total bar length = AI predicted count
 *
 * Memoized to prevent unnecessary re-renders (rerender-memo)
 */
export const ActionTypeAccuracyChart = memo(function ActionTypeAccuracyChart({
	data,
}: ActionTypeAccuracyChartProps) {
	const t = useTranslations('actionAnalysis')

	const chartData = useMemo(() =>
		data.map(item => {
			const total = item.verifiedCorrect + item.verifiedIncorrect
			const accuracy = total > 0 ? (item.verifiedCorrect / total) * 100 : 0
			return {
				actionType: item.actionType.replace(/_/g, ' '),
				correct: item.verifiedCorrect,
				incorrect: item.verifiedIncorrect,
				total,
				accuracy,
			}
		}),
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
					{t('description')}
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
										<p className='mb-2 font-medium'>{item.actionType}</p>
										<div className='flex flex-col gap-1 text-sm'>
											<div className='flex items-center justify-between gap-4'>
												<span className='text-muted-foreground'>{t('total')}:</span>
												<span className='font-medium'>{item.total}</span>
											</div>
											<div className='flex items-center justify-between gap-4'>
												<div className='flex items-center gap-1.5'>
													<span className='size-2.5 rounded-full' style={{ backgroundColor: chartConfig.correct.color }} />
													<span className='text-muted-foreground'>{t('agentConfirmed')}:</span>
												</div>
												<span className='font-medium'>{item.correct}</span>
											</div>
											<div className='flex items-center justify-between gap-4'>
												<div className='flex items-center gap-1.5'>
													<span className='size-2.5 rounded-full' style={{ backgroundColor: chartConfig.incorrect.color }} />
													<span className='text-muted-foreground'>{t('agentCorrected')}:</span>
												</div>
												<span className='font-medium'>{item.incorrect}</span>
											</div>
											<div className='mt-1 flex items-center justify-between gap-4 border-t pt-1'>
												<span className='text-muted-foreground'>{t('accuracy')}:</span>
												<span className='font-semibold'>{item.accuracy.toFixed(1)}%</span>
											</div>
										</div>
									</div>
								)
							}}
						/>
						<Legend
							formatter={(value: string) =>
								value === 'correct' ? t('agentConfirmed') : t('agentCorrected')
							}
						/>
						<Bar
							dataKey='correct'
							stackId='stack'
							fill={chartConfig.correct.color}
							radius={[0, 0, 0, 0]}
						/>
						<Bar
							dataKey='incorrect'
							stackId='stack'
							fill={chartConfig.incorrect.color}
							radius={[0, 4, 4, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
})
