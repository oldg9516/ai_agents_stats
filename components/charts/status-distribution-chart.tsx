'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Label, Pie, PieChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from '@/components/ui/chart'
import type { StatusDistribution } from '@/lib/supabase/types'

interface StatusDistributionChartProps {
	data: StatusDistribution[]
}

/**
 * Status Distribution Chart - Pie chart showing thread status breakdown
 *
 * Features:
 * - Pie chart with theme colors (chart-1 to chart-5)
 * - Shows count and percentage
 * - Responsive design
 */
export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
	const t = useTranslations()

	// Helper to create safe CSS variable name (replace spaces and special chars with dashes)
	const toSafeCssName = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '-')

	// Create chart config dynamically from data (same as dashboard)
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {}
		data.forEach((item, index) => {
			const chartIndex = (index % 5) + 1
			const safeName = toSafeCssName(item.status)
			config[safeName] = {
				label: item.status, // Use original status as label
				color: `var(--chart-${chartIndex})`,
			}
		})
		return config
	}, [data])

	// Transform data for Recharts format (same as dashboard)
	const chartData = useMemo(() => {
		return data.map(item => ({
			status: toSafeCssName(item.status),
			count: item.count,
			percentage: item.percentage,
			fill: `var(--color-${toSafeCssName(item.status)})`,
		}))
	}, [data])

	// Calculate total count
	const totalCount = useMemo(() => {
		return data.reduce((sum, item) => sum + item.count, 0)
	}, [data])

	if (chartData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>{t('charts.statusDistribution.title')}</CardTitle>
					<CardDescription className='text-sm'>
						{t('charts.statusDistribution.description')}
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
					<CardTitle className='text-lg sm:text-xl'>{t('charts.statusDistribution.title')}</CardTitle>
					<InfoTooltip content={t('charts.statusDistribution.tooltip')} />
				</div>
				<CardDescription className='text-sm'>
					{t('charts.statusDistribution.description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<ChartContainer config={chartConfig} className='mx-auto aspect-square max-h-[300px] w-full'>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name, item) => (
										<div className='flex flex-col gap-1'>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Count:</span>
												<span className='font-medium'>{value}</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Percentage:</span>
												<span className='font-medium'>
													{item.payload.percentage.toFixed(1)}%
												</span>
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
							strokeWidth={2}
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor='middle'
												dominantBaseline='middle'
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className='fill-foreground text-2xl font-bold'
												>
													{totalCount}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 20}
													className='fill-muted-foreground text-xs'
												>
													Total Threads
												</tspan>
											</text>
										)
									}
								}}
							/>
						</Pie>
						<ChartLegend
							content={<ChartLegendContent className='flex-wrap gap-2 text-xs' />}
							className='-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center'
						/>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
