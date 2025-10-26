'use client'

import { useState, useMemo } from 'react'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { QualityTrendData } from '@/lib/supabase/types'

interface QualityTrendsChartProps {
	data: QualityTrendData[]
}

// Color palette for categories
const CATEGORY_COLORS = [
	'#3b82f6', // blue
	'#10b981', // green
	'#f59e0b', // amber
	'#ef4444', // red
	'#8b5cf6', // violet
	'#ec4899', // pink
	'#06b6d4', // cyan
	'#f97316', // orange
]

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

	// Extract unique categories and assign colors
	const categories = useMemo(() => {
		const uniqueCategories = Array.from(new Set(data.map((d) => d.category)))
		return uniqueCategories.map((category, index) => ({
			name: category,
			color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
		}))
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

	// Custom tooltip
	const CustomTooltip = ({ active, payload, label }: any) => {
		if (!active || !payload || !payload.length) return null

		return (
			<div className="bg-background border border-border rounded-lg p-3 shadow-lg">
				<p className="font-medium mb-2">{format(new Date(label), 'MMM d, yyyy')}</p>
				{payload.map((entry: any, index: number) => (
					<div key={index} className="flex items-center gap-2 text-sm">
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: entry.color }}
						/>
						<span className="text-muted-foreground">{entry.name}:</span>
						<span className="font-medium">{entry.value.toFixed(1)}%</span>
					</div>
				))}
			</div>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<CardTitle>Quality Trends Over Time</CardTitle>
						<CardDescription>
							Track quality percentage by category across different time periods
						</CardDescription>
					</div>

					{/* Time Period Selector */}
					<div className="flex gap-2">
						{(['7d', '30d', '3m', 'all'] as const).map((period) => (
							<Button
								key={period}
								variant={selectedPeriod === period ? 'default' : 'outline'}
								size="sm"
								onClick={() => setSelectedPeriod(period)}
							>
								{period === '7d' && 'Last 7 days'}
								{period === '30d' && 'Last 30 days'}
								{period === '3m' && 'Last 3 months'}
								{period === 'all' && 'All time'}
							</Button>
						))}
					</div>
				</div>

				{/* Interactive Legend with Checkboxes */}
				<div className="flex flex-wrap gap-4 mt-4">
					{categories.map((category) => (
						<div key={category.name} className="flex items-center gap-2">
							<Checkbox
								id={`category-${category.name}`}
								checked={!hiddenCategories.has(category.name)}
								onCheckedChange={() => toggleCategory(category.name)}
							/>
							<Label
								htmlFor={`category-${category.name}`}
								className="flex items-center gap-2 cursor-pointer"
							>
								<div
									className="w-3 h-3 rounded-full"
									style={{ backgroundColor: category.color }}
								/>
								<span className="text-sm">{category.name}</span>
							</Label>
						</div>
					))}
				</div>
			</CardHeader>

			<CardContent>
				{chartData.length === 0 ? (
					<div className="flex items-center justify-center h-[300px] text-muted-foreground">
						No data available for selected period
					</div>
				) : (
					<ResponsiveContainer width="100%" height={300}>
						<LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
							<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
							<XAxis
								dataKey="week"
								tickFormatter={formatWeek}
								className="text-xs text-muted-foreground"
							/>
							<YAxis
								domain={[0, 100]}
								tickFormatter={(value) => `${value}%`}
								className="text-xs text-muted-foreground"
							/>
							<Tooltip content={<CustomTooltip />} />
							{categories.map((category) => (
								<Line
									key={category.name}
									type="monotone"
									dataKey={category.name}
									stroke={category.color}
									strokeWidth={2}
									dot={{ fill: category.color, r: 4 }}
									activeDot={{ r: 6 }}
									hide={hiddenCategories.has(category.name)}
									connectNulls
								/>
							))}
						</LineChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	)
}
