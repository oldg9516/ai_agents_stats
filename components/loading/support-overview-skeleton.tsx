import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { KPISectionSkeleton } from './kpi-skeleton'
import { ChartSkeleton } from './chart-skeleton'
import { TableSkeleton } from './table-skeleton'

/**
 * Skeleton loader for Support Filter Bar
 */
function SupportFilterBarSkeleton() {
	return (
		<div className='space-y-4 p-4 border rounded-lg bg-card'>
			<div className='flex items-center justify-between'>
				<Skeleton className='h-5 w-16' />
				<Skeleton className='h-8 w-20' />
			</div>
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'>
				<Skeleton className='h-20 w-full' />
				<Skeleton className='h-20 w-full' />
				<Skeleton className='h-20 w-full' />
				<Skeleton className='h-20 w-full' />
				<Skeleton className='h-20 w-full' />
			</div>
		</div>
	)
}

/**
 * Complete skeleton loader for Support Overview page
 */
export function SupportOverviewSkeleton() {
	return (
		<div className='space-y-6 p-4 sm:p-6'>
			{/* Filters */}
			<SupportFilterBarSkeleton />

			{/* KPI Cards */}
			<KPISectionSkeleton />

			{/* Charts Grid */}
			<div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2'>
				<ChartSkeleton />
				<ChartSkeleton />
				<ChartSkeleton />
				<ChartSkeleton />
			</div>

			{/* Support Threads Table */}
			<TableSkeleton />
		</div>
	)
}
