import { DetailedStatsContent } from '@/components/detailed-stats-content'
import { TableSkeleton } from '@/components/loading/table-skeleton'
import { Suspense } from 'react'

/**
 * Detailed Stats Page - Full page view of detailed statistics table
 *
 * Features:
 * - Full-screen table view
 * - All table features (sorting, search, pagination, export)
 * - Same filter controls as main dashboard
 * - Data fetching via React Query on client side
 */
export default function DetailedStatsPage() {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<DetailedStatsContent />
		</Suspense>
	)
}
