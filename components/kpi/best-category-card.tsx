'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IconTrophy, IconArrowUp, IconArrowDown, IconMinus } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { getCategoryLabel } from '@/constants/category-labels'
import type { KPIData, TrendData } from '@/lib/supabase/types'

interface BestCategoryCardProps {
	data: KPIData['bestCategory']
}

export function BestCategoryCard({ data }: BestCategoryCardProps) {
	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<CardTitle className='text-sm font-medium'>Best Category</CardTitle>
				<div className='h-4 w-4 text-muted-foreground'>
					<IconTrophy className='h-4 w-4' />
				</div>
			</CardHeader>
			<CardContent>
				{data.category ? (
					<>
						<div className='space-y-0.5'>
							<div className='text-xl sm:text-2xl font-bold leading-tight'>
								{getCategoryLabel(data.category)}
							</div>
							<div className='text-lg sm:text-xl font-semibold text-muted-foreground'>
								{data.percentage.toFixed(1)}%
							</div>
						</div>
						{data.trend && <TrendIndicator trend={data.trend} />}
					</>
				) : (
					<div className='text-2xl font-bold'>No data</div>
				)}
				<p className='text-xs text-muted-foreground mt-1'>Highest quality category</p>
			</CardContent>
		</Card>
	)
}

/**
 * Trend Indicator Component
 */
function TrendIndicator({ trend }: { trend: TrendData }) {
	const isPositive = trend.direction === 'up'
	const isNegative = trend.direction === 'down'

	const trendColor = isPositive
		? 'text-green-600 dark:text-green-400'
		: isNegative
		? 'text-red-600 dark:text-red-400'
		: 'text-muted-foreground'

	const TrendIcon = isPositive ? IconArrowUp : isNegative ? IconArrowDown : IconMinus

	return (
		<div className={cn('flex items-center text-xs mt-1', trendColor)}>
			<TrendIcon className='h-3 w-3 mr-1' />
			<span className='font-medium'>{trend.percentage.toFixed(1)}%</span>
			<span className='text-muted-foreground ml-1'>vs previous period</span>
		</div>
	)
}
