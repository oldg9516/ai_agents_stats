import { DashboardContent } from '@/components/dashboard-content'
import { SupportOverviewSkeleton } from '@/components/loading/support-overview-skeleton'
import { Suspense } from 'react'

/**
 * Dashboard Page - Server Component
 *
 * This is a server component that renders the client-side dashboard.
 * No server-side data fetching here - using React Query for client-side data management.
 */
export default function DashboardPage() {
	return (
		<Suspense fallback={<SupportOverviewSkeleton />}>
			<DashboardContent />
		</Suspense>
	)
}
