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
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { getCategoryLabel } from '@/constants/category-labels'
import type { CategoryDistributionData } from '@/lib/supabase/types'
import { useMemo } from 'react'
import { Label, Pie, PieChart } from 'recharts'

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
export function CategoryPieChart({ data }: CategoryPieChartProps) {
	// Create chart config dynamically from data
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {}
		data.forEach((item, index) => {
			const chartIndex = (index % 5) + 1
			config[item.category] = {
				label: getCategoryLabel(item.category),
				color: `var(--chart-${chartIndex})`,
			}
		})
		return config
	}, [data])

	// Transform data for Recharts format
	const chartData = useMemo(() => {
		return data.map(item => ({
			category: item.category,
			records: item.totalRecords,
			quality: item.goodPercentage,
			fill: `var(--color-${item.category})`,
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
					<CardTitle className='text-lg sm:text-xl'>
						Quality by Category
					</CardTitle>
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
		<Card className='min-w-0'>
			<CardHeader>
				<CardTitle className='text-lg sm:text-xl'>
					Quality by Category
				</CardTitle>
				<CardDescription className='text-sm'>
					Distribution across categories with quality levels
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<ChartContainer
					config={chartConfig}
					className='mx-auto aspect-square max-h-[300px] w-full'
				>
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
							content={
								<ChartLegendContent className='flex-wrap gap-2 text-xs' />
							}
							className='-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center'
						/>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
