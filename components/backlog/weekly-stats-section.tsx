'use client'

import type { WeeklyStats } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../ui/table'
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'
import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'

interface WeeklyStatsSectionProps {
	weeklyStats: WeeklyStats[]
}

// Chart colors for categories (explicit hex colors for SVG compatibility)
const CHART_COLORS = [
	'#f97316', // orange
	'#3b82f6', // blue
	'#22c55e', // green
	'#a855f7', // purple
	'#ec4899', // pink
	'#14b8a6', // teal
	'#f59e0b', // amber
	'#6366f1', // indigo
]

/**
 * Format week date for display
 */
function formatWeekDate(weekStr: string): string {
	try {
		const date = parseISO(weekStr)
		return format(date, 'MMM d')
	} catch {
		return weekStr
	}
}

/**
 * Weekly Stats Section - Shows both table and bar chart for weekly data
 */
export function WeeklyStatsSection({ weeklyStats }: WeeklyStatsSectionProps) {
	const t = useTranslations()

	// Handle case where weeklyStats is not an array (e.g., from JSON parsing)
	const weeklyStatsArray = Array.isArray(weeklyStats) ? weeklyStats : []

	// Sort by week date and format for chart
	const chartData = useMemo(() => {
		return [...weeklyStatsArray]
			.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
			.map(week => ({
				...week,
				weekFormatted: formatWeekDate(week.week),
			}))
	}, [weeklyStatsArray])

	// Get unique category keys (excluding 'week', 'weekFormatted' and 'total')
	const categoryKeys = useMemo(() => {
		if (weeklyStatsArray.length === 0) return []

		const keys = new Set<string>()
		weeklyStatsArray.forEach(week => {
			Object.keys(week).forEach(key => {
				if (key !== 'week' && key !== 'total' && key !== 'weekFormatted') {
					keys.add(key)
				}
			})
		})
		return Array.from(keys).sort()
	}, [weeklyStatsArray])

	if (weeklyStatsArray.length === 0) {
		return (
			<div className='flex items-center justify-center min-h-[200px] text-muted-foreground'>
				{t('backlogReports.detail.noWeeklyStats')}
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			{/* Bar Chart */}
			<Card>
				<CardHeader>
					<CardTitle className='text-base'>
						{t('backlogReports.detail.weeklyTrend')}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='h-[350px]'>
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart data={chartData}>
								<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
								<XAxis
									dataKey='weekFormatted'
									tick={{ fontSize: 12 }}
									className='text-muted-foreground'
								/>
								<YAxis tick={{ fontSize: 12 }} className='text-muted-foreground' />
								<Tooltip
									contentStyle={{
										backgroundColor: 'hsl(var(--background))',
										border: '1px solid hsl(var(--border))',
										borderRadius: '6px',
									}}
									labelFormatter={(label) => `Week: ${label}`}
								/>
								<Legend />
								<Bar
									dataKey='total'
									name={t('backlogReports.detail.total')}
									fill='#0ea5e9'
									radius={[4, 4, 0, 0]}
								/>
								{categoryKeys.slice(0, 5).map((key, index) => (
									<Bar
										key={key}
										dataKey={key}
										name={key}
										fill={CHART_COLORS[index % CHART_COLORS.length]}
										radius={[4, 4, 0, 0]}
									/>
								))}
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Data Table */}
			<Card>
				<CardHeader>
					<CardTitle className='text-base'>
						{t('backlogReports.detail.weeklyBreakdown')}
					</CardTitle>
				</CardHeader>
				<CardContent className='overflow-x-auto'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className='font-semibold'>
									{t('backlogReports.detail.week')}
								</TableHead>
								<TableHead className='text-right font-semibold'>
									{t('backlogReports.detail.total')}
								</TableHead>
								{categoryKeys.map(key => (
									<TableHead key={key} className='text-right'>
										{key}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{chartData.map((week, index) => (
								<TableRow key={index}>
									<TableCell className='font-medium'>{week.weekFormatted}</TableCell>
									<TableCell className='text-right font-semibold'>
										{week.total}
									</TableCell>
									{categoryKeys.map(key => (
										<TableCell key={key} className='text-right'>
											{((week as Record<string, unknown>)[key] as number) || 0}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
