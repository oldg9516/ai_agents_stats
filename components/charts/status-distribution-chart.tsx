'use client'

import { useMemo } from 'react'
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { getStatusLabel, getStatusColor } from '@/constants/support-statuses'
import type { StatusDistribution } from '@/lib/supabase/types'

interface StatusDistributionChartProps {
	data: StatusDistribution[]
}

/**
 * Status Distribution Chart - Pie chart showing thread status breakdown
 *
 * Features:
 * - Pie chart with status-based colors
 * - Shows count and percentage
 * - Responsive design
 */
export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
	// Transform data for chart
	const chartData = useMemo(() => {
		return data.map((item, index) => ({
			status: getStatusLabel(item.status),
			count: item.count,
			percentage: item.percentage,
			fill: `var(--color-status-${index})`,
		}))
	}, [data])

	// Create chart config
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {}
		data.forEach((item, index) => {
			config[`status-${index}`] = {
				label: getStatusLabel(item.status),
				color: getStatusColor(item.status),
			}
		})
		return config
	}, [data])

	if (chartData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>Status Distribution</CardTitle>
					<CardDescription className='text-sm'>
						Breakdown of threads by status
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center justify-center h-[250px] text-sm text-muted-foreground'>
						No data available
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className='min-w-0'>
			<CardHeader>
				<CardTitle className='text-lg sm:text-xl'>Status Distribution</CardTitle>
				<CardDescription className='text-sm'>
					Breakdown of threads by status
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<ChartContainer config={chartConfig} className='mx-auto aspect-square max-h-[300px]'>
					<PieChart>
						<ChartTooltip
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name, item) => (
										<div className='flex flex-col gap-1'>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Status:</span>
												<span className='font-medium'>{item.payload.status}</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Count:</span>
												<span className='font-medium'>{item.payload.count}</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Percentage:</span>
												<span className='font-medium'>{item.payload.percentage.toFixed(1)}%</span>
											</div>
										</div>
									)}
								/>
							}
						/>
						<Pie
							data={chartData}
							dataKey='count'
							nameKey='status'
							innerRadius='60%'
							outerRadius='80%'
							paddingAngle={2}
						>
							{chartData.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={entry.fill} />
							))}
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
