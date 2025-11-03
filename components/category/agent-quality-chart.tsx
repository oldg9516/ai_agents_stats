'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import type { CategoryAgentStats } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface AgentQualityChartProps {
	data: CategoryAgentStats[]
}

/**
 * Agent Quality Chart Component
 *
 * Horizontal bar chart showing quality percentage by agent
 * Features:
 * - Color-coded bars (chart-1)
 * - Tooltips with details (records, quality %, changed count)
 * - Labels on bars
 * - Agent email display (shortened)
 */
export function AgentQualityChart({ data }: AgentQualityChartProps) {
	const t = useTranslations('category.agentChart')

	// Transform data for chart
	const chartData = useMemo(() => {
		return data.map((item) => {
			// Shorten email for display (keep first part before @)
			const shortName = item.agent.split('@')[0] || item.agent

			return {
				agent: shortName,
				fullAgent: item.agent,
				quality: Number(item.goodPercentage.toFixed(1)),
				records: item.totalRecords,
				changed: item.changedRecords,
			}
		})
	}, [data])

	const chartConfig: ChartConfig = {
		quality: {
			label: t('quality'),
			color: 'var(--chart-1)',
		},
	}

	if (data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-base sm:text-lg'>{t('title')}</CardTitle>
					<CardDescription className='text-xs sm:text-sm'>
						{t('description')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-sm text-muted-foreground text-center py-4'>
						{t('noData')}
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base sm:text-lg'>{t('title')}</CardTitle>
				<CardDescription className='text-xs sm:text-sm'>
					{t('description')}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className='h-[300px] w-full'>
					<BarChart
						data={chartData}
						layout='vertical'
						margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							type='number'
							domain={[0, 100]}
							tickFormatter={(value) => `${value}%`}
						/>
						<YAxis
							dataKey='agent'
							type='category'
							width={80}
							tickLine={false}
							axisLine={false}
							className='text-xs'
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name, item) => (
										<div className='flex flex-col gap-1'>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>
													{t('agent')}:
												</span>
												<span className='font-medium text-xs'>
													{item.payload.fullAgent}
												</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>
													{t('quality')}:
												</span>
												<span className='font-medium'>{value}%</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>
													{t('records')}:
												</span>
												<span className='font-medium'>
													{item.payload.records}
												</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>
													{t('changed')}:
												</span>
												<span className='font-medium'>
													{item.payload.changed}
												</span>
											</div>
										</div>
									)}
								/>
							}
						/>
						<Bar dataKey='quality' fill='var(--color-quality)' radius={[0, 4, 4, 0]}>
							<LabelList
								dataKey='quality'
								position='right'
								offset={8}
								className='fill-foreground text-xs font-medium'
								formatter={(value: number) => `${value}%`}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
