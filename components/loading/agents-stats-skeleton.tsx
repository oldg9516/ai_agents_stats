import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Agent Stats Skeleton - Loading state for agent statistics page
 */
export function AgentsStatsSkeleton() {
	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			<div className='space-y-6'>
				{/* Filters skeleton */}
				<Card>
					<CardHeader>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
							<div className='space-y-2'>
								<Skeleton className='h-6 w-48' />
								<Skeleton className='h-4 w-72' />
							</div>
							<div className='flex gap-2'>
								<Skeleton className='h-10 w-[200px]' />
								<Skeleton className='h-10 w-[120px]' />
								<Skeleton className='h-10 w-[120px]' />
							</div>
						</div>
					</CardHeader>
				</Card>

				{/* Table skeleton */}
				<Card>
					<CardHeader>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
							<div className='space-y-2'>
								<Skeleton className='h-6 w-40' />
								<Skeleton className='h-4 w-64' />
							</div>
							<Skeleton className='h-10 w-full max-w-sm' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='space-y-3'>
							{/* Table header */}
							<div className='flex gap-4'>
								{[1, 2, 3, 4, 5, 6, 7].map(i => (
									<Skeleton key={i} className='h-10 flex-1' />
								))}
							</div>
							{/* Table rows */}
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
								<div key={i} className='flex gap-4'>
									{[1, 2, 3, 4, 5, 6, 7].map(j => (
										<Skeleton key={j} className='h-12 flex-1' />
									))}
								</div>
							))}
							{/* Total row */}
							<div className='flex gap-4 border-t pt-3'>
								{[1, 2, 3, 4, 5, 6, 7].map(i => (
									<Skeleton key={i} className='h-12 flex-1 bg-muted' />
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
