'use client'

import { useMemo, useState, memo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { getCategoryLabel } from '@/constants/category-labels'
import { LAUNCHED_CATEGORIES, resolveAutomationStatus } from '@/constants/automation-rules'
import { getDayStart, getMonthStart, getWeekStart } from '@/lib/db/queries/utils'
import type {
	AutomationOverviewRecord,
	AutomationTrendBucket,
	CategoryAutomationOverviewStats,
	TrendBucketGranularity,
} from '@/lib/db/types'

interface AutomationTrendsChartProps {
	categories: CategoryAutomationOverviewStats[]
	rawRecords: AutomationOverviewRecord[]
	dateRange: { from: Date; to: Date }
}

const DAY_MS = 24 * 60 * 60 * 1000

function pickGranularity(from: Date, to: Date): TrendBucketGranularity {
	const days = Math.ceil((to.getTime() - from.getTime()) / DAY_MS)
	if (days <= 14) return 'day'
	if (days <= 90) return 'week'
	return 'month'
}

function bucketStartFor(date: Date, granularity: TrendBucketGranularity): string {
	if (granularity === 'day') return getDayStart(date)
	if (granularity === 'week') return getWeekStart(new Date(date))
	return getMonthStart(date)
}

function generateBucketKeys(
	from: Date,
	to: Date,
	granularity: TrendBucketGranularity,
): string[] {
	const keys: string[] = []
	const seen = new Set<string>()
	const cursor = new Date(from)

	while (cursor.getTime() <= to.getTime()) {
		const key = bucketStartFor(new Date(cursor), granularity)
		if (!seen.has(key)) {
			seen.add(key)
			keys.push(key)
		}
		if (granularity === 'day') {
			cursor.setDate(cursor.getDate() + 1)
		} else if (granularity === 'week') {
			cursor.setDate(cursor.getDate() + 7)
		} else {
			cursor.setMonth(cursor.getMonth() + 1)
		}
	}
	return keys
}

function formatBucket(iso: string, granularity: TrendBucketGranularity): string {
	try {
		const date = new Date(iso)
		if (granularity === 'month') return format(date, 'MMM yyyy')
		return format(date, 'd MMM')
	} catch {
		return iso
	}
}

/**
 * Automation Trends Chart — line chart showing auto-replies and drafts over time
 * for a single selected request_subtype subcategory.
 *
 * Bucket granularity is auto-selected from the date range:
 *  ≤14 days → day, ≤90 days → week, otherwise month.
 */
export const AutomationTrendsChart = memo(function AutomationTrendsChart({
	categories,
	rawRecords,
	dateRange,
}: AutomationTrendsChartProps) {
	const t = useTranslations('charts.automationTrends')

	const sortedCategories = useMemo(() => {
		const launchedSet = new Set<string>(LAUNCHED_CATEGORIES)
		return categories.filter(
			(c) => c.category && c.category !== 'Unknown' && launchedSet.has(c.category),
		)
	}, [categories])

	const [selectedCategory, setSelectedCategory] = useState<string>(
		() => sortedCategories[0]?.category ?? '',
	)

	// Reset selection if the selected category disappears (e.g., after filter change)
	const effectiveCategory = useMemo(() => {
		if (sortedCategories.some((c) => c.category === selectedCategory)) {
			return selectedCategory
		}
		return sortedCategories[0]?.category ?? ''
	}, [sortedCategories, selectedCategory])

	const granularity = useMemo(
		() => pickGranularity(dateRange.from, dateRange.to),
		[dateRange.from, dateRange.to],
	)

	const chartData = useMemo<AutomationTrendBucket[]>(() => {
		if (!effectiveCategory) return []

		const bucketKeys = generateBucketKeys(dateRange.from, dateRange.to, granularity)
		const buckets = new Map<string, AutomationTrendBucket>()
		bucketKeys.forEach((key) => {
			buckets.set(key, { bucketStart: key, autoReplyCount: 0, draftCount: 0 })
		})

		for (const record of rawRecords) {
			if (record.request_subtype !== effectiveCategory) continue
			if (!record.created_at) continue

			const key = bucketStartFor(new Date(record.created_at), granularity)
			let bucket = buckets.get(key)
			if (!bucket) {
				bucket = { bucketStart: key, autoReplyCount: 0, draftCount: 0 }
				buckets.set(key, bucket)
			}

			const { status } = resolveAutomationStatus(record)
			if (status === 'auto_reply') bucket.autoReplyCount++
			else bucket.draftCount++
		}

		return Array.from(buckets.values()).sort(
			(a, b) => new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime(),
		)
	}, [rawRecords, effectiveCategory, dateRange.from, dateRange.to, granularity])

	const hasData = chartData.some(
		(bucket) => bucket.autoReplyCount > 0 || bucket.draftCount > 0,
	)

	const chartConfig = useMemo<ChartConfig>(
		() => ({
			autoReplyCount: { label: t('autoReplies'), color: 'var(--chart-1)' },
			draftCount: { label: t('drafts'), color: 'var(--chart-2)' },
		}),
		[t],
	)

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
					<div className='flex-1 min-w-0'>
						<div className='flex items-center gap-1.5'>
							<CardTitle className='text-lg sm:text-xl'>{t('title')}</CardTitle>
							<InfoTooltip content={t('tooltip')} />
						</div>
						<CardDescription className='text-sm mt-1'>
							{t('description')}
						</CardDescription>
					</div>

					<div className='flex flex-col gap-1.5 lg:min-w-[280px]'>
						<span className='text-xs text-muted-foreground'>
							{t('subcategoryLabel')}
						</span>
						<Select
							value={effectiveCategory}
							onValueChange={setSelectedCategory}
							disabled={sortedCategories.length === 0}
						>
							<SelectTrigger className='w-full'>
								<SelectValue placeholder={t('subcategoryPlaceholder')} />
							</SelectTrigger>
							<SelectContent>
								{sortedCategories.map((category) => (
									<SelectItem key={category.category} value={category.category}>
										<span className='truncate'>
											{getCategoryLabel(category.category)}
										</span>
										<span className='ml-2 text-xs text-muted-foreground'>
											({category.totalRecords})
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{!effectiveCategory || !hasData ? (
					<div className='flex items-center justify-center h-[300px] text-muted-foreground text-sm'>
						{t('noData')}
					</div>
				) : (
					<ChartContainer config={chartConfig} className='h-[350px] w-full'>
						<LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey='bucketStart'
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								tickFormatter={(value: string) => formatBucket(value, granularity)}
							/>
							<YAxis
								allowDecimals={false}
								tickLine={false}
								tickMargin={10}
								axisLine={false}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										indicator='dot'
										labelFormatter={(value) => {
											try {
												const date = new Date(value as string)
												if (granularity === 'month') return format(date, 'MMMM yyyy')
												return format(date, 'd MMM yyyy')
											} catch {
												return String(value)
											}
										}}
									/>
								}
							/>
							<Line
								type='monotone'
								dataKey='autoReplyCount'
								name={t('autoReplies')}
								stroke='var(--color-autoReplyCount)'
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
							<Line
								type='monotone'
								dataKey='draftCount'
								name={t('drafts')}
								stroke='var(--color-draftCount)'
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
						</LineChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	)
})

