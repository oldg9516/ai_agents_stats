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
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { notFound } from 'next/navigation'
import { subDays } from 'date-fns'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CategoryDetailContent } from '@/components/category-detail-content'

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
			agents: [...QUALIFIED_AGENTS],
		},
		{ page: 0, pageSize: 20 }
	)

	return (
		<Dialog open defaultOpen>
			<DialogContent className='max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-7xl h-[95vh] sm:h-[90vh] p-0 gap-0 flex flex-col overflow-hidden'>
				<div className='flex-1 overflow-y-auto overflow-x-hidden'>
					<div className='p-4 sm:p-6'>
						<CategoryDetailContent
							categoryName={categoryName}
							isModal={true}
							initialData={initialData}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
