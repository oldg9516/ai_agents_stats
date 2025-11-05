import { RequestCategoriesContent } from '@/components/request-categories-content'
import { TableSkeleton } from '@/components/loading/table-skeleton'
import { Suspense } from 'react'

/**
 * Request Categories Page - Shows breakdown of request types and subtypes
 *
 * Features:
 * - Full-screen table view
 * - All table features (sorting, search, pagination, export)
 * - No filters - shows all historical data
 * - Data fetching via React Query on client side
 */
export default function RequestCategoriesPage() {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<RequestCategoriesContent />
		</Suspense>
	)
}
