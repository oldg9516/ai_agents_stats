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
	const { categoryName: categoryParam } = await params

	// Decode URL-encoded parameter (Next.js doesn't auto-decode in App Router)
	const decodedParam = decodeURIComponent(categoryParam)

	// Parse categories - can be comma-separated for multiple categories
	const categories = decodedParam.split(',').map(c => c.trim())

	// For display purposes, use the decoded param (can contain multiple categories)
	const categoryName = decodedParam

	// Validate at least one category exists
	const exists = await checkCategoryExists(categories[0])
	if (!exists) {
		notFound()
	}

	// Fetch initial data with default filters
	const initialData = await fetchCategoryDetail(
		categories,
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
