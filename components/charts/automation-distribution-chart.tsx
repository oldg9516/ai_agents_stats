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
import type { CategoryAutomationOverviewStats } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

interface AutomationDistributionChartProps {
	data: CategoryAutomationOverviewStats[]
}

const chartConfig: ChartConfig = {
	autoReplyCount: {
		label: 'Auto-Reply',
		color: '#7B3FA0',
	},
	draftCount: {
		label: 'Draft',
		color: '#D4B8E8',
	},
}

/**
 * Automation Distribution Chart
 *
 * Horizontal stacked bar chart showing auto-reply vs draft per category.
 */
export const AutomationDistributionChart = memo(
	function AutomationDistributionChart({
		data,
	}: AutomationDistributionChartProps) {
		const t = useTranslations('automationOverview')

		const chartData = useMemo(
			() =>
				data.map(item => ({
					category: item.category.replace(/_/g, ' '),
					autoReplyCount: item.autoReplyCount,
					draftCount: item.draftCount,
				})),
			[data],
		)

		if (chartData.length === 0) return null

		const chartHeight = Math.max(250, chartData.length * 35)

		return (
			<Card className='min-w-0'>
				<CardHeader>
					<div className='flex items-center gap-1.5'>
						<CardTitle className='text-lg sm:text-xl'>
							{t('chartTitle')}
						</CardTitle>
						<InfoTooltip content={t('tooltipChart')} />
					</div>
					<CardDescription className='text-sm'>
						{t('chartDescription')}
					</CardDescription>
				</CardHeader>
				<CardContent className='overflow-hidden'>
					<ChartContainer
						config={chartConfig}
						className='w-full'
						style={{ height: chartHeight }}
					>
						<BarChart
							data={chartData}
							layout='vertical'
							margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
						>
							<CartesianGrid horizontal={false} strokeDasharray='3 3' />
							<XAxis type='number' tickLine={false} axisLine={false} />
							<YAxis
								type='category'
								dataKey='category'
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
									const total = item.autoReplyCount + item.draftCount
									return (
										<div className='rounded-lg border bg-background p-3 shadow-md'>
											<p className='mb-1 font-medium'>{item.category}</p>
											<div className='text-sm space-y-0.5'>
												<div>
													<span className='text-muted-foreground'>
														{t('total')}:{' '}
													</span>
													<span className='font-medium'>{total}</span>
												</div>
												<div>
													<span
														className='inline-block w-2 h-2 rounded-full mr-1.5'
														style={{
															backgroundColor: chartConfig.autoReplyCount.color,
														}}
													/>
													<span className='text-muted-foreground'>
														{t('autoReply')}:{' '}
													</span>
													<span className='font-medium'>
														{item.autoReplyCount}
													</span>
													<span className='text-muted-foreground ml-1'>
														(
														{total > 0
															? ((item.autoReplyCount / total) * 100).toFixed(0)
															: 0}
														%)
													</span>
												</div>
												<div>
													<span
														className='inline-block w-2 h-2 rounded-full mr-1.5'
														style={{
															backgroundColor: chartConfig.draftCount.color,
														}}
													/>
													<span className='text-muted-foreground'>
														{t('draft')}:{' '}
													</span>
													<span className='font-medium'>{item.draftCount}</span>
													<span className='text-muted-foreground ml-1'>
														(
														{total > 0
															? ((item.draftCount / total) * 100).toFixed(0)
															: 0}
														%)
													</span>
												</div>
											</div>
										</div>
									)
								}}
							/>
							<Bar
								dataKey='autoReplyCount'
								stackId='a'
								fill={chartConfig.autoReplyCount.color}
								radius={[0, 0, 0, 0]}
							/>
							<Bar
								dataKey='draftCount'
								stackId='a'
								fill={chartConfig.draftCount.color}
								radius={[0, 4, 4, 0]}
							/>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>
		)
	},
)
