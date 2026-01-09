import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Chart Skeleton - Loading state for chart components
 */
export function ChartSkeleton() {
	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="space-y-2 flex-1 min-w-0">
						<Skeleton className="h-6 w-full max-w-48" />
						<Skeleton className="h-4 w-full max-w-72" />
					</div>
					<div className="flex gap-2 flex-wrap">
						<Skeleton className="h-9 w-20 sm:w-24" />
						<Skeleton className="h-9 w-20 sm:w-24" />
						<Skeleton className="h-9 w-20 sm:w-24" />
					</div>
				</div>
				<div className="flex flex-wrap gap-4 mt-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-5 w-24 sm:w-32" />
					))}
				</div>
			</CardHeader>
			<CardContent>
				<Skeleton className="h-[300px] w-full" />
			</CardContent>
		</Card>
	)
}
