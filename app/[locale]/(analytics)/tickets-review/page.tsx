import { TicketsReviewSkeleton } from '@/components/loading/tickets-review-skeleton'
import { TicketsReviewContent } from '@/components/tickets-review-content'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
	title: 'Tickets Review | AI Agent Stats',
	description: 'Analyze reviewed tickets with classifications',
}

/**
 * Tickets Review Page - Server Component
 *
 * Main page for reviewing tickets with classifications
 * Shows only reviewed tickets (change_classification IS NOT NULL)
 * Shows table with filters for detailed analysis
 * Data fetching handled by React Query on client side
 */
export default function TicketsReviewPage() {
	return (
		<div className='flex flex-1 flex-col'>
			<div className='@container/main flex flex-1 flex-col gap-2'>
				<Suspense fallback={<TicketsReviewSkeleton />}>
					<TicketsReviewContent />
				</Suspense>
			</div>
		</div>
	)
}
