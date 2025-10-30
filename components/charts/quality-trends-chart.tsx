'use client'

import { useState, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Button } from '@/components/ui/button'
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

type TimePeriod = '7d' | '30d' | '3m' | 'all'

/**
 * Quality Trends Chart - Area chart showing quality trends over time
 *
 * Features:
 * - Multi-area chart (one per category)
 * - Interactive legend with checkboxes
 * - Time period selector
 * - Responsive design
 * - Uses theme colors automatically
 */
export function QualityTrendsChart({ data }: QualityTrendsChartProps) {
	const t = useTranslations()
	const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d')
	const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

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
							<div className="flex items-center gap-1.5">
								<CardTitle className="text-lg sm:text-xl">{t('charts.qualityTrends.title')}</CardTitle>
								<InfoTooltip content={t('charts.qualityTrends.tooltip')} />
							</div>
							<CardDescription className="text-sm mt-1">
								{t('charts.qualityTrends.description')}
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
									{period === '7d' && t('filters.quickOptions.7d')}
									{period === '30d' && t('filters.quickOptions.30d')}
									{period === '3m' && t('filters.quickOptions.3m')}
									{period === 'all' && t('filters.quickOptions.all')}
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
										className='w-3 h-3 rounded-sm shrink-0'
										style={{ backgroundColor: `var(--color-${category.name})` }}
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
