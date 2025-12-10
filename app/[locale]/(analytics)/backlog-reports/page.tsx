import { BacklogReportsContent } from '@/components/backlog-reports-content'
import { SupportOverviewSkeleton } from '@/components/loading/support-overview-skeleton'
import { Suspense } from 'react'

/**
 * Backlog Reports Page - Server Component
 *
 * Displays list of AI-generated backlog analysis reports
 */
export default function BacklogReportsPage() {
	return (
		<Suspense fallback={<SupportOverviewSkeleton />}>
			<BacklogReportsContent />
		</Suspense>
	)
}
