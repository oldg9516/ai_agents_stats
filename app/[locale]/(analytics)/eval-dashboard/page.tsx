import { Metadata } from 'next'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { EvalDashboardContent } from '@/components/eval-dashboard-content'

export const metadata: Metadata = {
	title: 'Eval Dashboard | AI Agent Stats',
	description: 'Intent readiness evaluation dashboard',
}

function EvalDashboardSkeleton() {
	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			<Skeleton className='h-10 w-64' />
			<Skeleton className='h-[500px] w-full' />
		</div>
	)
}

export default function EvalDashboardPage() {
	return (
		<div className='flex flex-1 flex-col'>
			<div className='@container/main flex flex-1 flex-col gap-2'>
				<Suspense fallback={<EvalDashboardSkeleton />}>
					<EvalDashboardContent />
				</Suspense>
			</div>
		</div>
	)
}
