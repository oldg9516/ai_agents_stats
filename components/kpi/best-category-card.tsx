'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { IconTrophy, IconArrowUp, IconArrowDown, IconMinus } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { getCategoryLabel } from '@/constants/category-labels'
import type { KPIData, TrendData } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { memo } from 'react'

interface BestCategoryCardProps {
	data: KPIData['bestCategory']
}

export const BestCategoryCard = memo(function BestCategoryCard({ data }: BestCategoryCardProps) {
	const t = useTranslations()

	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<div className='flex items-center gap-1.5'>
					<CardTitle className='text-sm font-medium'>{t('kpi.bestCategory.title')}</CardTitle>
					<InfoTooltip content={t('kpi.bestCategory.tooltip')} />
				</div>
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
					<div className='text-2xl font-bold'>{t('common.noData')}</div>
				)}
				<p className='text-xs text-muted-foreground mt-1'>{t('kpi.bestCategory.description')}</p>
			</CardContent>
		</Card>
	)
})

/**
 * Trend Indicator Component
 * Memoized to prevent unnecessary re-renders
 */
const TrendIndicator = memo(function TrendIndicator({ trend }: { trend: TrendData }) {
	const t = useTranslations()
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
			<span className='text-muted-foreground ml-1'>{t('kpi.vs')} {t('kpi.previous')}</span>
		</div>
	)
})
