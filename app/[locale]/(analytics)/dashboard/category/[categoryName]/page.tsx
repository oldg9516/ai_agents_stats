/**
 * Category Detail Full Page
 *
 * This page shows complete category statistics in a full page view
 * Accessed directly via URL or via "Open in Full Page" button in modal
 */

import { fetchCategoryDetail, checkCategoryExists } from '@/lib/actions/category-actions'
import { notFound } from 'next/navigation'
import { subDays } from 'date-fns'
import { CategoryDetailContent } from '@/components/category-detail-content'

interface CategoryPageProps {
	params: Promise<{
		categoryName: string
		locale: string
	}>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
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

	return (
		<div className='container mx-auto p-6'>
			<CategoryDetailContent categoryName={categoryName} isModal={false} initialData={initialData} />
		</div>
	)
}
