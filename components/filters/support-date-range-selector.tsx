'use client'

import { DateRangeFilter } from './date-range-filter'

interface SupportDateRangeSelectorProps {
	from: Date
	to: Date
	onDateRangeChange: (from: Date, to: Date) => void
}

/**
 * Support Date Range Selector - Standalone date range picker for support overview page
 *
 * Features:
 * - Date range selection (from/to)
 * - Compact layout for page header
 * - Uses same DateRangeFilter component
 */
export function SupportDateRangeSelector({
	from,
	to,
	onDateRangeChange,
}: SupportDateRangeSelectorProps) {
	return (
		<div className='w-full sm:w-auto'>
			<DateRangeFilter from={from} to={to} onChange={onDateRangeChange} />
		</div>
	)
}
