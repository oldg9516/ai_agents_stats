'use client'

import { DateRangeFilter } from './date-range-filter'

interface TicketsReviewDateRangeSelectorProps {
	from: Date
	to: Date
	onDateRangeChange: (from: Date, to: Date) => void
}

/**
 * Date Range Selector for Tickets Review
 * Wrapper around DateRangeFilter with tickets review specific context
 */
export function TicketsReviewDateRangeSelector({
	from,
	to,
	onDateRangeChange,
}: TicketsReviewDateRangeSelectorProps) {
	return (
		<DateRangeFilter
			from={from}
			to={to}
			onChange={onDateRangeChange}
		/>
	)
}
