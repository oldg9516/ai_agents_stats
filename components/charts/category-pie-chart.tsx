'use client'

import { useMemo } from 'react'
import { Label, Pie, PieChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { getQualityColor } from '@/lib/utils/quality-colors'
import { getCategoryLabel } from '@/constants/category-labels'
import type { CategoryDistributionData } from '@/lib/supabase/types'

interface CategoryPieChartProps {
	data: CategoryDistributionData[]
	onCategoryClick?: (category: string) => void
}

/**
 * Category Pie Chart - Shows distribution of records by category
 *
 * Features:
 * - Donut chart with quality-based colors
 * - Shows category name, record count, and quality percentage
 * - Responsive legend
 */
export function CategoryPieChart({ data, onCategoryClick }: CategoryPieChartProps) {
	// Create chart config dynamically from data
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {}
		data.forEach((item) => {
			config[item.category] = {
				label: getCategoryLabel(item.category),
				color: getQualityColor(item.goodPercentage),
			}
		})
		return config
	}, [data])

	// Transform data for Recharts format
	const chartData = useMemo(() => {
		return data.map((item) => ({
			category: item.category,
			records: item.totalRecords,
			quality: item.goodPercentage,
			fill: getQualityColor(item.goodPercentage),
		}))
	}, [data])

	// Calculate total records
	const totalRecords = useMemo(() => {
		return data.reduce((sum, item) => sum + item.totalRecords, 0)
	}, [data])

	if (data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>Quality by Category</CardTitle>
					<CardDescription className='text-sm'>
						Distribution across categories with quality levels
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
		<Card>
			<CardHeader>
				<CardTitle className='text-lg sm:text-xl'>Quality by Category</CardTitle>
				<CardDescription className='text-sm'>
					Distribution across categories with quality levels
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className='h-[300px] w-full'>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name, item) => (
										<div className='flex flex-col gap-1'>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Records:</span>
												<span className='font-medium'>{value}</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Quality:</span>
												<span className='font-medium'>
													{item.payload.quality.toFixed(1)}%
												</span>
											</div>
										</div>
									)}
								/>
							}
						/>
						<Pie
							data={chartData}
							dataKey='records'
							nameKey='category'
							innerRadius={60}
							outerRadius={100}
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
													{totalRecords}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 20}
													className='fill-muted-foreground text-xs'
												>
													Total Records
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
