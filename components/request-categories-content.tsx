'use client'

import { RequestCategoriesTable } from '@/components/tables/request-categories-table'
import { DateRangeFilter } from '@/components/filters/date-range-filter'
import { useState } from 'react'
import { endOfTodayInIsrael, startOfNDaysAgoInIsrael } from '@/lib/utils/date-tz'

/**
 * Request Categories Content - Client Component
 *
 * Shows breakdown of all request types and subtypes with counts and percentages
 * Filterable by date range
 */
export function RequestCategoriesContent() {
	const [dateRange, setDateRange] = useState({
		from: startOfNDaysAgoInIsrael(29),
		to: endOfTodayInIsrael(),
	})

	// Handle date range change from DateRangeFilter
	const handleDateRangeChange = (from: Date, to: Date) => {
		setDateRange({ from, to })
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Date Filter - using reusable DateRangeFilter component */}
			<DateRangeFilter
				from={dateRange.from}
				to={dateRange.to}
				onChange={handleDateRangeChange}
			/>

			{/* Request Categories Table - handles its own data fetching */}
			<RequestCategoriesTable dateRange={dateRange} />
		</div>
	)
}
