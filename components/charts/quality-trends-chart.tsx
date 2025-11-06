'use client'

import { useState, useMemo, useEffect } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { getCategoryLabel } from '@/constants/category-labels'
import type { QualityTrendData } from '@/lib/supabase/types'

interface QualityTrendsChartProps {
	data: QualityTrendData[]
}

/**
 * Quality Trends Chart - Area chart showing quality trends over time
 *
 * Features:
 * - Multi-area chart (one per category)
 * - Interactive legend with checkboxes
 * - Responsive design
 * - Uses theme colors automatically
 * - Data is filtered by page-level date range filters
 */
export function QualityTrendsChart({ data }: QualityTrendsChartProps) {
	const t = useTranslations()

	// Create chart config dynamically from categories
	const { chartConfig, categories } = useMemo(() => {
		const uniqueCategories = Array.from(new Set(data.map((d) => d.category)))
		const config: ChartConfig = {}

		uniqueCategories.forEach((category, index) => {
			const chartIndex = (index % 5) + 1
			config[category] = {
				label: getCategoryLabel(category),
				color: `var(--chart-${chartIndex})`,
			}
		})

		const cats = uniqueCategories.map((key) => ({
			name: key,
			label: getCategoryLabel(key),
		}))

		return { chartConfig: config, categories: cats }
	}, [data])

	// Hide all categories beyond the first 3 by default
	const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

	// Update hidden categories when categories change
	useEffect(() => {
		if (categories.length > 3) {
			const categoriesToHide = categories.slice(3).map(c => c.name)
			setHiddenCategories(new Set(categoriesToHide))
		}
	}, [categories])

	// Transform data for Recharts format
	// Input: [{ category, weekStart, goodPercentage }, ...]
	// Output: [{ week: "2024-01-01", "Category1": 85.2, "Category2": 70.5 }, ...]
	// Note: Data is already filtered by page-level date filters
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
		return Array.from(weekMap.values()).sort(
			(a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()
		)
	}, [data])

	// Toggle category visibility - max 3 categories can be shown at once
	const toggleCategory = (categoryName: string) => {
		setHiddenCategories((prev) => {
			const newSet = new Set(prev)
			const visibleCount = categories.length - newSet.size

			if (newSet.has(categoryName)) {
				// If category is hidden, try to show it
				// But only if we don't already have 3 visible
				if (visibleCount < 3) {
					newSet.delete(categoryName)
				}
			} else {
				// If category is visible, hide it (always allowed)
				newSet.add(categoryName)
			}
			return newSet
		})
	}

	// Format week for x-axis - show week end date (Saturday) instead of start
	const formatWeek = (dateString: string) => {
		try {
			const weekStart = new Date(dateString)
			// Add 6 days to get to Saturday (end of week)
			const weekEnd = new Date(weekStart)
			weekEnd.setDate(weekStart.getDate() + 6)
			// But don't go beyond today
			const today = new Date()
			const displayDate = weekEnd > today ? today : weekEnd
			return format(displayDate, 'MMM d')
		} catch {
			return dateString
		}
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col gap-4">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5">
							<CardTitle className="text-lg sm:text-xl">{t('charts.qualityTrends.title')}</CardTitle>
							<InfoTooltip content={t('charts.qualityTrends.tooltip')} />
						</div>
						<CardDescription className="text-sm mt-1">
							{t('charts.qualityTrends.description')}
						</CardDescription>
					</div>

					{/* Interactive Legend with Checkboxes - Max 3 visible */}
					<div className='flex flex-col gap-2'>
						<div className='flex flex-wrap gap-3 sm:gap-4'>
							{categories.map((category) => {
								const isVisible = !hiddenCategories.has(category.name)
								const visibleCount = categories.length - hiddenCategories.size
								const isDisabled = !isVisible && visibleCount >= 3

								return (
									<div key={category.name} className='flex items-center gap-2 min-w-0'>
										<Checkbox
											id={`category-${category.name}`}
											checked={isVisible}
											onCheckedChange={() => toggleCategory(category.name)}
											disabled={isDisabled}
										/>
										<Label
											htmlFor={`category-${category.name}`}
											className={`flex items-center gap-2 min-w-0 ${
												isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
											}`}
										>
											<div
												className='w-3 h-3 rounded-sm shrink-0'
												style={{ backgroundColor: `var(--color-${category.name})` }}
											/>
											<span className='text-xs sm:text-sm truncate'>{category.label}</span>
										</Label>
									</div>
								)
							})}
						</div>
						<p className='text-xs text-muted-foreground'>
							{t('charts.qualityTrends.maxThreeCategories')}
						</p>
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
						<AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
							<defs>
								{categories.map((category) => (
									<linearGradient
										key={`gradient-${category.name}`}
										id={`fill-${category.name}`}
										x1='0'
										y1='0'
										x2='0'
										y2='1'
									>
										<stop
											offset='5%'
											stopColor={`var(--color-${category.name})`}
											stopOpacity={0.8}
										/>
										<stop
											offset='95%'
											stopColor={`var(--color-${category.name})`}
											stopOpacity={0.1}
										/>
									</linearGradient>
								))}
							</defs>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey='week'
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								tickFormatter={formatWeek}
							/>
							<YAxis
								domain={[0, 100]}
								ticks={[0, 25, 50, 75, 100]}
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
										indicator='dot'
									/>
								}
							/>
							{categories.map((category) => (
								<Area
									key={category.name}
									type='natural'
									dataKey={category.name}
									stroke={`var(--color-${category.name})`}
									fill={`url(#fill-${category.name})`}
									strokeWidth={2}
									hide={hiddenCategories.has(category.name)}
									connectNulls
								/>
							))}
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	)
}
