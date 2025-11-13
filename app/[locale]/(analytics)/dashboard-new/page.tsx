import { DashboardContentNew } from '@/components/dashboard-content-new'
import { SupportOverviewSkeleton } from '@/components/loading/support-overview-skeleton'
import { Suspense } from 'react'

/**
 * Dashboard NEW Page - Server Component
 *
 * Uses NEW logic with change_classification field:
 * - AI Success Rate = (no_significant_change + stylistic_preference) / total * 100
 * - AI Failure Rate = (critical_error + meaningful_improvement) / total * 100
 *
 * This is a server component that renders the client-side dashboard.
 * No server-side data fetching here - using React Query for client-side data management.
 */
export default function DashboardNewPage() {
	return (
		<Suspense fallback={<SupportOverviewSkeleton />}>
			<DashboardContentNew />
		</Suspense>
	)
}
