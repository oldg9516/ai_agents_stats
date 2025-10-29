import { DashboardContent } from '@/components/dashboard-content'
import { Suspense } from 'react'
import { KPISectionSkeleton } from '@/components/loading/kpi-skeleton'

/**
 * Dashboard Page - Server Component
 *
 * This is a server component that renders the client-side dashboard.
 * No server-side data fetching here - using React Query for client-side data management.
 */
export default function DashboardPage() {
	return (
		<Suspense fallback={<KPISectionSkeleton />}>
			<DashboardContent />
		</Suspense>
	)
}
