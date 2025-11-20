import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for Tickets Review page
 */
export function TicketsReviewSkeleton() {
	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Filters Section */}
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
				<div className='lg:order-1'>
					<Skeleton className='h-10 w-32' />
				</div>
				<div className='lg:order-2 lg:flex-1'>
					<Skeleton className='h-10 w-full' />
				</div>
			</div>

			{/* Table Card */}
			<Card>
				<CardHeader>
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
						<div>
							<CardTitle className='text-lg sm:text-xl'>
								<Skeleton className='h-6 w-48' />
							</CardTitle>
							<CardDescription className='text-sm mt-2'>
								<Skeleton className='h-4 w-64' />
							</CardDescription>
						</div>
						<Skeleton className='h-9 w-32' />
					</div>
				</CardHeader>
				<CardContent>
					{/* Search */}
					<div className='mb-4'>
						<Skeleton className='h-10 w-full' />
					</div>

					{/* Table */}
					<div className='rounded-md border'>
						<div className='p-4 space-y-3'>
							{Array.from({ length: 10 }).map((_, i) => (
								<Skeleton key={i} className='h-12 w-full' />
							))}
						</div>
					</div>

					{/* Pagination */}
					<div className='flex items-center justify-between pt-4'>
						<Skeleton className='h-4 w-48' />
						<div className='flex items-center space-x-2'>
							<Skeleton className='h-9 w-24' />
							<Skeleton className='h-9 w-24' />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
