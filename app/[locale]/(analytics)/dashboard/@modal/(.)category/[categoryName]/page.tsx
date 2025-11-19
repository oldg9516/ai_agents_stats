/**
 * Category Detail Modal - Parallel Route
 *
 * This modal intercepts the /dashboard/category/:name route
 * Shows category details in a modal overlay while keeping the dashboard in background
 *
 * Pattern: @modal/(.)category/[categoryName] intercepts /category/[categoryName]
 * The (.) means "intercept at the same level"
 */

import { fetchCategoryDetail, checkCategoryExists } from '@/lib/actions/category-actions'
import { notFound } from 'next/navigation'
import { subDays } from 'date-fns'
import { CategoryDetailModal } from '@/components/category-detail-modal'

interface CategoryModalPageProps {
	params: Promise<{
		categoryName: string
		locale: string
	}>
}

export default async function CategoryModalPage({ params }: CategoryModalPageProps) {
	const { categoryName } = await params

	// Validate category exists
	const exists = await checkCategoryExists(categoryName)
	if (!exists) {
		notFound()
	}

	// Fetch initial data with default filters
	const initialData = await fetchCategoryDetail(
		categoryName,
		{
			dateRange: {
				from: subDays(new Date(), 30),
				to: new Date(),
			},
			versions: [],
			agents: [], // All agents (no filter)
		},
		{ page: 0, pageSize: 20 }
	)

	return <CategoryDetailModal categoryName={categoryName} initialData={initialData} />
}
