import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TrendData } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { IconArrowDown, IconArrowUp, IconMinus } from '@tabler/icons-react'

interface KPICardProps {
	title: string
	value: string | number
	trend?: TrendData
	icon?: React.ReactNode
	description?: string
	className?: string
}

/**
 * Base KPI Card Component
 *
 * Displays a metric with optional trend indicator
 */
export function KPICard({
	title,
	value,
	trend,
	icon,
	description,
	className,
}: KPICardProps) {
	return (
		<Card className={cn('', className)}>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<CardTitle className='text-sm font-medium'>{title}</CardTitle>
				{icon && <div className='h-4 w-4 text-muted-foreground'>{icon}</div>}
			</CardHeader>
			<CardContent>
				<div
					className='text-2xl font-bold truncate'
					title={typeof value === 'string' ? value : undefined}
				>
					{value}
				</div>
				{trend && <TrendIndicator trend={trend} />}
				{description && (
					<p className='text-xs text-muted-foreground mt-1'>{description}</p>
				)}
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

	const TrendIcon = isPositive
		? IconArrowUp
		: isNegative
		? IconArrowDown
		: IconMinus

	return (
		<div className={cn('flex items-center text-xs mt-1', trendColor)}>
			<TrendIcon className='h-3 w-3 mr-1' />
			<span className='font-medium'>{trend.percentage.toFixed(1)}%</span>
			<span className='text-muted-foreground ml-1'>vs previous period</span>
		</div>
	)
}
