'use client'

import { useState, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { getCategoryLabel } from '@/constants/category-labels'
import type { QualityTrendData } from '@/lib/supabase/types'

interface QualityTrendsChartProps {
	data: QualityTrendData[]
}

type TimePeriod = '7d' | '30d' | '3m' | 'all'

/**
 * Quality Trends Chart - Main line chart showing quality trends over time
 *
 * Features:
 * - Multi-line chart (one per category)
 * - Interactive legend with checkboxes
 * - Time period selector
 * - Responsive design
 */
export function QualityTrendsChart({ data }: QualityTrendsChartProps) {
	const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d')
	const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

	// Create chart config dynamically from categories
	const chartConfig = useMemo(() => {
		const uniqueCategories = Array.from(new Set(data.map((d) => d.category)))
		const config: ChartConfig = {}

		uniqueCategories.forEach((category, index) => {
			config[category] = {
				label: getCategoryLabel(category),
				color: `hsl(var(--chart-${(index % 5) + 1}))`,
			}
		})

		return config
	}, [data])

	// Extract categories with their info
	const categories = useMemo(() => {
		return Object.keys(chartConfig).map((key) => ({
			name: key,
			label: chartConfig[key].label,
			color: chartConfig[key].color,
		}))
	}, [chartConfig])

	// Transform data for Recharts format
	// Input: [{ category, weekStart, goodPercentage }, ...]
	// Output: [{ week: "2024-01-01", "Category1": 85.2, "Category2": 70.5 }, ...]
	const chartData = useMemo(() => {
		// Group by week
		const weekMap = new Map<string, Record<string, number | string>>()

		data.forEach(({ category, weekStart, goodPercentage }) => {
			if (!weekMap.has(weekStart)) {
				weekMap.set(weekStart, { week: weekStart })
			}
			const weekData = weekMap.get(weekStart)!
			weekData[category] = goodPercentage
		})

		// Convert to array and sort by date
		const result = Array.from(weekMap.values()).sort(
			(a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()
		)

		// Filter by time period
		const now = new Date()
		const filterDate = new Date(now)

		switch (selectedPeriod) {
			case '7d':
				filterDate.setDate(now.getDate() - 7)
				break
			case '30d':
				filterDate.setDate(now.getDate() - 30)
				break
			case '3m':
				filterDate.setMonth(now.getMonth() - 3)
				break
			case 'all':
				return result // No filtering
		}

		return result.filter((d) => new Date(d.week) >= filterDate)
	}, [data, selectedPeriod])

	// Toggle category visibility
	const toggleCategory = (categoryName: string) => {
		setHiddenCategories((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(categoryName)) {
				newSet.delete(categoryName)
			} else {
				newSet.add(categoryName)
			}
			return newSet
		})
	}

	// Format week for x-axis
	const formatWeek = (dateString: string) => {
		try {
			const date = new Date(dateString)
			return format(date, 'MMM d')
		} catch {
			return dateString
		}
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col gap-4">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
						<div className="flex-1 min-w-0">
							<CardTitle className="text-lg sm:text-xl">Quality Trends Over Time</CardTitle>
							<CardDescription className="text-sm mt-1">
								Track quality percentage by category
							</CardDescription>
						</div>

						{/* Time Period Selector */}
						<div className="flex flex-wrap gap-2 sm:flex-nowrap">
							{(['7d', '30d', '3m', 'all'] as const).map((period) => (
								<Button
									key={period}
									variant={selectedPeriod === period ? 'default' : 'outline'}
									size="sm"
									onClick={() => setSelectedPeriod(period)}
									className="text-xs sm:text-sm flex-1 sm:flex-none whitespace-nowrap"
								>
									{period === '7d' && '7d'}
									{period === '30d' && '30d'}
									{period === '3m' && '3m'}
									{period === 'all' && 'All'}
								</Button>
							))}
						</div>
					</div>

					{/* Interactive Legend with Checkboxes */}
					<div className='flex flex-wrap gap-3 sm:gap-4'>
						{categories.map((category) => (
							<div key={category.name} className='flex items-center gap-2 min-w-0'>
								<Checkbox
									id={`category-${category.name}`}
									checked={!hiddenCategories.has(category.name)}
									onCheckedChange={() => toggleCategory(category.name)}
								/>
								<Label
									htmlFor={`category-${category.name}`}
									className='flex items-center gap-2 cursor-pointer min-w-0'
								>
									<div
										className='w-3 h-3 rounded-full shrink-0'
										style={{
											backgroundColor: category.color?.includes('var')
												? `hsl(${category.color.match(/\d+/)?.[0] || 0} 70% 50%)`
												: category.color,
										}}
									/>
									<span className='text-xs sm:text-sm truncate'>{category.label}</span>
								</Label>
							</div>
						))}
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{chartData.length === 0 ? (
					<div className='flex items-center justify-center h-[300px] text-muted-foreground'>
						No data available for selected period
					</div>
				) : (
					<ChartContainer config={chartConfig} className='h-[350px] w-full'>
						<LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
							<CartesianGrid vertical={false} strokeDasharray='3 3' />
							<XAxis
								dataKey='week'
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								tickFormatter={formatWeek}
							/>
							<YAxis
								domain={[0, 100]}
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								tickFormatter={(value) => `${value}%`}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={(value) => {
											try {
												return format(new Date(value), 'MMM d, yyyy')
											} catch {
												return value
											}
										}}
										formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
									/>
								}
							/>
							{categories.map((category) => (
								<Line
									key={category.name}
									type='monotone'
									dataKey={category.name}
									stroke={`var(--color-${category.name})`}
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
									hide={hiddenCategories.has(category.name)}
									connectNulls
								/>
							))}
						</LineChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	)
}
