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
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { VersionComparisonData } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'

interface VersionBarChartProps {
	data: VersionComparisonData[]
}

/**
 * Version Bar Chart - Shows quality comparison across prompt versions
 *
 * Features:
 * - Bar chart with quality-based colors
 * - Shows version and quality percentage
 * - Color-coded bars (red/yellow/green)
 * - Memoized to prevent unnecessary re-renders
 */
export const VersionBarChart = memo(function VersionBarChart({ data }: VersionBarChartProps) {
	const t = useTranslations()

	// Sort and transform data (newest versions first)
	const chartData = useMemo(() => {
		const sorted = [...data].sort((a, b) => {
			// Extract version number (e.g., "v1" -> 1)
			const getVersionNum = (version: string) => {
				const match = version.match(/\d+/)
				return match ? parseInt(match[0]) : 0
			}
			return getVersionNum(b.version) - getVersionNum(a.version)
		})

		return sorted.map(item => ({
			version: item.version,
			quality: item.goodPercentage,
			records: item.totalRecords,
			fill: `var(--color-${item.version})`,
		}))
	}, [data])

	// Create chart config
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {
			quality: {
				label: 'Quality',
			},
		}
		// Add each version to config
		data.forEach((item, index) => {
			const chartIndex = (index % 12) + 1
			config[item.version] = {
				label: item.version,
				color: `var(--chart-${chartIndex})`,
			}
		})
		return config
	}, [data])

	if (chartData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>
						{t('charts.versionComparison.title')}
					</CardTitle>
					<CardDescription className='text-sm'>
						{t('charts.versionComparison.description')}
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
						{t('charts.versionComparison.title')}
					</CardTitle>
					<InfoTooltip content={t('charts.versionComparison.tooltip')} />
				</div>
				<CardDescription className='text-sm'>
					{t('charts.versionComparison.description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<ChartContainer config={chartConfig} className='h-[300px] w-full'>
					<BarChart
						data={chartData}
						margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
					>
						<CartesianGrid vertical={false} strokeDasharray='3 3' />
						<XAxis
							dataKey='version'
							tickLine={false}
							tickMargin={10}
							axisLine={false}
						/>
						<YAxis
							domain={[0, 100]}
							tickLine={false}
							tickMargin={5}
							axisLine={false}
							tickFormatter={value => `${value}%`}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name, item) => (
										<div className='flex flex-col gap-1'>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Version:</span>
												<span className='font-medium'>
													{item.payload.version}
												</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Quality:</span>
												<span className='font-medium'>{value}%</span>
											</div>
											<div className='flex items-center justify-between gap-2'>
												<span className='text-muted-foreground'>Records:</span>
												<span className='font-medium'>
													{item.payload.records}
												</span>
											</div>
										</div>
									)}
								/>
							}
						/>
						<Bar dataKey='quality' radius={[8, 8, 0, 0]}>
							<LabelList
								dataKey='quality'
								position='top'
								offset={8}
								className='fill-foreground text-xs font-medium'
								formatter={(value: number) => `${value.toFixed(1)}%`}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
})
