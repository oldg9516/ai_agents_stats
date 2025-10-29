import { SupportOverviewSkeleton } from '@/components/loading/support-overview-skeleton'
import { SupportOverviewContent } from '@/components/support-overview-content'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
	title: 'Support Overview | AI Agent Stats',
	description: 'Monitor and analyze support thread operations',
}

/**
 * Support Overview Page - Server Component
 *
 * Main page for support operations analytics
 * Shows KPIs, charts, and threads with quality metrics
 * Data fetching handled by React Query on client side
 */
export default function SupportOverviewPage() {
	return (
		<div className='flex flex-1 flex-col'>
			<div className='@container/main flex flex-1 flex-col gap-2'>
				<Suspense fallback={<SupportOverviewSkeleton />}>
					<SupportOverviewContent />
				</Suspense>
			</div>
		</div>
	)
}
