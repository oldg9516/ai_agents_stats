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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
	AutoCloseRecord,
	AutomationOverviewRecord,
	AutomationTrendBucket,
	CategoryAutomationOverviewStats,
	TrendBucketGranularity,
} from '@/lib/db/types'

interface AutomationTrendsChartProps {
	categories: CategoryAutomationOverviewStats[]
	rawRecords: AutomationOverviewRecord[]
	dateRange: { from: Date; to: Date }
	/** Auto-closed ticket records (no subtype) — only plotted for the Total view. */
	autoCloseRecords?: AutoCloseRecord[]
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
	autoCloseRecords = [],
}: AutomationTrendsChartProps) {
	const t = useTranslations('charts.automationTrends')

	const sortedCategories = useMemo(() => {
		const launchedSet = new Set<string>(LAUNCHED_CATEGORIES)
		return categories.filter(
			(c) => c.category && c.category !== 'Unknown' && launchedSet.has(c.category),
		)
	}, [categories])

	const [selectedCategory, setSelectedCategory] = useState<string>('__total__')
	const [valueMode, setValueMode] = useState<'count' | 'percent'>('count')

	const effectiveCategory = useMemo(() => {
		if (selectedCategory === '__total__') return '__total__'
		if (sortedCategories.some((c) => c.category === selectedCategory)) {
			return selectedCategory
		}
		return '__total__'
	}, [sortedCategories, selectedCategory])

	const granularity = useMemo(
		() => pickGranularity(dateRange.from, dateRange.to),
		[dateRange.from, dateRange.to],
	)

	// Auto-closes have no subtype — only shown in the Total view.
	const showAutoClose = effectiveCategory === '__total__' && autoCloseRecords.length > 0

	const chartData = useMemo<
		(AutomationTrendBucket & {
			autoCloseCount: number
			autoReplyPercent: number
			draftPercent: number
			autoClosePercent: number
		})[]
	>(() => {
		if (!effectiveCategory) return []

		type Bucket = AutomationTrendBucket & { autoCloseCount: number }
		const bucketKeys = generateBucketKeys(dateRange.from, dateRange.to, granularity)
		const buckets = new Map<string, Bucket>()
		const makeBucket = (key: string): Bucket => ({
			bucketStart: key,
			autoReplyCount: 0,
			draftCount: 0,
			autoCloseCount: 0,
		})
		bucketKeys.forEach((key) => buckets.set(key, makeBucket(key)))

		for (const record of rawRecords) {
			if (!record.created_at) continue
			if (effectiveCategory !== '__total__') {
				if (record.request_subtype !== effectiveCategory) continue
			}

			const key = bucketStartFor(new Date(record.created_at), granularity)
			let bucket = buckets.get(key)
			if (!bucket) {
				bucket = makeBucket(key)
				buckets.set(key, bucket)
			}

			const status = record.actual_outcome ?? resolveAutomationStatus(record).status
			if (status === 'auto_reply') bucket.autoReplyCount++
			else bucket.draftCount++
		}

		if (showAutoClose) {
			for (const record of autoCloseRecords) {
				if (!record.created_at) continue
				const key = bucketStartFor(new Date(record.created_at), granularity)
				let bucket = buckets.get(key)
				if (!bucket) {
					bucket = makeBucket(key)
					buckets.set(key, bucket)
				}
				bucket.autoCloseCount++
			}
		}

		return Array.from(buckets.values())
			.sort(
				(a, b) => new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime(),
			)
			.map((b) => {
				const total = b.autoReplyCount + b.draftCount + b.autoCloseCount
				return {
					...b,
					autoReplyPercent: total > 0 ? (b.autoReplyCount / total) * 100 : 0,
					draftPercent: total > 0 ? (b.draftCount / total) * 100 : 0,
					autoClosePercent: total > 0 ? (b.autoCloseCount / total) * 100 : 0,
				}
			})
	}, [rawRecords, autoCloseRecords, showAutoClose, effectiveCategory, dateRange.from, dateRange.to, granularity])

	const totalRecordsForTotal = useMemo(
		() => categories.reduce((sum, c) => sum + c.totalRecords, 0),
		[categories],
	)

	const hasData = chartData.some(
		(bucket) => bucket.autoReplyCount > 0 || bucket.draftCount > 0,
	)

	const chartConfig = useMemo<ChartConfig>(
		() => ({
			autoReplyCount: { label: t('autoReplies'), color: 'var(--chart-1)' },
			draftCount: { label: t('drafts'), color: 'var(--chart-2)' },
			autoCloseCount: { label: t('autoClosed'), color: 'var(--chart-3)' },
			autoReplyPercent: { label: t('autoReplies'), color: 'var(--chart-1)' },
			draftPercent: { label: t('drafts'), color: 'var(--chart-2)' },
			autoClosePercent: { label: t('autoClosed'), color: 'var(--chart-3)' },
		}),
		[t],
	)

	const isPercent = valueMode === 'percent'
	const autoReplyKey = isPercent ? 'autoReplyPercent' : 'autoReplyCount'
	const draftKey = isPercent ? 'draftPercent' : 'draftCount'
	const autoCloseKey = isPercent ? 'autoClosePercent' : 'autoCloseCount'

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
						<ToggleGroup
							type='single'
							value={valueMode}
							onValueChange={(v) => {
								if (v === 'count' || v === 'percent') setValueMode(v)
							}}
							variant='outline'
							size='sm'
							className='self-start'
						>
							<ToggleGroupItem value='count'>{t('viewCount')}</ToggleGroupItem>
							<ToggleGroupItem value='percent'>{t('viewPercent')}</ToggleGroupItem>
						</ToggleGroup>
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
								<SelectItem value='__total__'>
									<span className='truncate font-medium'>{t('totalCategory')}</span>
									<span className='ml-2 text-xs text-muted-foreground'>
										({totalRecordsForTotal})
									</span>
								</SelectItem>
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
								domain={isPercent ? [0, 100] : undefined}
								tickFormatter={(value: number) =>
									isPercent ? `${Math.round(value)}%` : String(value)
								}
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
										formatter={(value, name, item) => {
											const numeric =
												typeof value === 'number' ? value : Number(value)
											const display = isPercent
												? `${numeric.toFixed(1)}%`
												: String(numeric)
											const labelKey = String(name)
											const cfg = chartConfig[labelKey]
											const label = cfg?.label ?? labelKey
											const color =
												(cfg?.color as string | undefined) ??
												(item?.color as string | undefined)
											return (
												<>
													<div
														className='shrink-0 rounded-[2px] h-2.5 w-2.5'
														style={{ backgroundColor: color }}
													/>
													<div className='flex flex-1 justify-between leading-none items-center'>
														<span className='text-muted-foreground'>{label}</span>
														<span className='text-foreground font-mono font-medium tabular-nums'>
															{display}
														</span>
													</div>
												</>
											)
										}}
									/>
								}
							/>
							<Line
								type='monotone'
								dataKey={autoReplyKey}
								name={autoReplyKey}
								stroke='var(--color-autoReplyCount)'
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
							<Line
								type='monotone'
								dataKey={draftKey}
								name={draftKey}
								stroke='var(--color-draftCount)'
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
							{showAutoClose && (
								<Line
									type='monotone'
									dataKey={autoCloseKey}
									name={autoCloseKey}
									stroke='var(--color-autoCloseCount)'
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
								/>
							)}
						</LineChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	)
})

