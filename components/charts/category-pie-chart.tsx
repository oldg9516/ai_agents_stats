'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { getCategoryLabel } from '@/constants/category-labels'
import type { CategoryDistributionResult } from '@/lib/supabase/types'
import { useMemo, useState, useRef, useEffect, memo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Label, Pie, PieChart, Cell } from 'recharts'

/**
 * Generate a unique color for each category using HSL
 * Distributes colors evenly around the color wheel
 */
function generateCategoryColor(index: number, total: number): string {
	// Use golden angle (~137.5°) for optimal color distribution
	const goldenAngle = 137.508
	const hue = (index * goldenAngle) % 360
	// Vary saturation and lightness slightly for better distinction
	const saturation = 65 + (index % 3) * 10 // 65-85%
	const lightness = 55 + (index % 2) * 10 // 55-65%
	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

interface CategoryPieChartProps {
	data: CategoryDistributionResult
	onCategoryClick?: (category: string) => void
}

/**
 * Category Pie Chart - Shows distribution of records by category
 *
 * Features:
 * - Donut chart with quality-based colors
 * - Shows category name, record count, and quality percentage
 * - Responsive legend
 * - Click on segment to view category details
 * - Memoized to prevent unnecessary re-renders
 */
export const CategoryPieChart = memo(function CategoryPieChart({ data }: CategoryPieChartProps) {
	const t = useTranslations()
	const router = useRouter()
	const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
	const legendRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

	// Handle category click
	const handleCategoryClick = useCallback((category: string) => {
		router.push(`/dashboard/category/${encodeURIComponent(category)}`)
	}, [router])

	// Generate unique colors for each category
	const categoryColors = useMemo(() => {
		const colors: Record<string, string> = {}
		const total = data.categories.length
		data.categories.forEach((item, index) => {
			colors[item.category] = generateCategoryColor(index, total)
		})
		return colors
	}, [data.categories])

	// Create chart config dynamically from data
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {}
		data.categories.forEach((item) => {
			config[item.category] = {
				label: getCategoryLabel(item.category),
				color: categoryColors[item.category],
			}
		})
		return config
	}, [data.categories, categoryColors])

	// Transform data for Recharts format
	const chartData = useMemo(() => {
		return data.categories.map(item => ({
			category: item.category,
			records: item.totalRecords,
			quality: item.goodPercentage,
			fill: categoryColors[item.category],
		}))
	}, [data.categories, categoryColors])

	// Use totalCount from query result instead of summing categories
	// This ensures accurate count even if data is truncated by Supabase limit
	const totalRecords = data.totalCount

	// Scroll legend item into view when hovering on chart
	useEffect(() => {
		if (hoveredCategory) {
			const element = legendRefs.current.get(hoveredCategory)
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
			}
		}
	}, [hoveredCategory])

	if (data.categories.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>
						{t('charts.categoryDistribution.title')}
					</CardTitle>
					<CardDescription className='text-sm'>
						{t('charts.categoryDistribution.description')}
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
					<CardTitle className='text-lg sm:text-xl'>
						{t('charts.categoryDistribution.title')}
					</CardTitle>
					<InfoTooltip content={t('charts.categoryDistribution.tooltip')} />
				</div>
				<CardDescription className='text-sm'>
					{t('charts.categoryDistribution.description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<div className='flex flex-col lg:flex-row gap-4'>
					{/* Pie Chart */}
					<div className='flex-shrink-0 lg:w-[280px]'>
						<ChartContainer
							config={chartConfig}
							className='mx-auto aspect-square max-h-[280px] w-full'
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
									onClick={(data) => {
										if (data && data.category) {
											handleCategoryClick(data.category)
										}
									}}
									className='cursor-pointer'
								>
									{chartData.map((entry, index) => (
										<Cell
											key={`cell-${index}`}
											className='hover:opacity-80 transition-opacity'
											onMouseEnter={() => setHoveredCategory(entry.category)}
											onMouseLeave={() => setHoveredCategory(null)}
										/>
									))}
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
															{t('charts.categoryDistribution.totalRecords')}
														</tspan>
													</text>
												)
											}
										}}
									/>
								</Pie>
							</PieChart>
						</ChartContainer>
					</div>

					{/* Scrollable Legend */}
					<div className='flex-1 min-w-0 max-h-[280px] overflow-y-auto pr-2'>
						<div className='flex flex-col gap-1.5'>
							{chartData.map((item) => (
								<button
									key={item.category}
									ref={(el) => {
										if (el) legendRefs.current.set(item.category, el)
									}}
									onClick={() => handleCategoryClick(item.category)}
									className={`flex items-center gap-2 text-left rounded px-2 py-1.5 transition-all group ${
										hoveredCategory === item.category
											? 'bg-primary/10 ring-2 ring-primary/50'
											: 'hover:bg-muted/50'
									}`}
								>
									<span
										className='w-3 h-3 rounded-sm flex-shrink-0'
										style={{ backgroundColor: item.fill }}
									/>
									<span className={`text-xs truncate flex-1 min-w-0 ${
										hoveredCategory === item.category
											? 'text-primary font-medium'
											: 'group-hover:text-primary'
									}`}>
										{getCategoryLabel(item.category)}
									</span>
									<span className='text-xs text-muted-foreground flex-shrink-0'>
										{item.records}
									</span>
								</button>
							))}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
})
