'use client'

import { RequestCategoriesTable } from '@/components/tables/request-categories-table'

/**
 * Request Categories Content - Client Component
 *
 * Shows breakdown of all request types and subtypes with counts and percentages
 * No filters - displays all historical data
 */
export function RequestCategoriesContent() {
	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Request Categories Table - handles its own data fetching */}
			<RequestCategoriesTable />
		</div>
	)
}
