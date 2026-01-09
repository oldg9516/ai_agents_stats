import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Table Skeleton - Loading state for data table
 */
export function TableSkeleton() {
	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="space-y-2 flex-1 min-w-0">
						<Skeleton className="h-6 w-full max-w-48" />
						<Skeleton className="h-4 w-full max-w-96" />
					</div>
					<Skeleton className="h-9 w-full sm:w-32" />
				</div>
				<Skeleton className="h-10 w-full max-w-sm" />
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{/* Table header */}
					<div className="flex gap-4">
						{[1, 2, 3, 4, 5, 6, 7].map((i) => (
							<Skeleton key={i} className="h-10 flex-1" />
						))}
					</div>
					{/* Table rows */}
					{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
						<div key={i} className="flex gap-4">
							{[1, 2, 3, 4, 5, 6, 7].map((j) => (
								<Skeleton key={j} className="h-12 flex-1" />
							))}
						</div>
					))}
					{/* Pagination */}
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
						<Skeleton className="h-5 w-full max-w-48" />
						<div className="flex gap-2 flex-wrap">
							<Skeleton className="h-9 w-20 sm:w-24" />
							<Skeleton className="h-9 w-20 sm:w-24" />
							<Skeleton className="h-9 w-20 sm:w-24" />
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
