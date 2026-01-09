import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton loader for a single KPI card
 */
export function KPICardSkeleton() {
	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<Skeleton className='h-4 w-full max-w-24' />
				<Skeleton className='h-4 w-4 shrink-0' />
			</CardHeader>
			<CardContent>
				<Skeleton className='h-8 w-full max-w-32 mb-2' />
				<Skeleton className='h-3 w-full max-w-40' />
			</CardContent>
		</Card>
	)
}

/**
 * Skeleton loader for the entire KPI section (4 cards)
 */
export function KPISectionSkeleton() {
	return (
		<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-4 sm:p-6'>
			<KPICardSkeleton />
			<KPICardSkeleton />
			<KPICardSkeleton />
			<KPICardSkeleton />
		</div>
	)
}
