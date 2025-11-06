'use client'

import { DateRangeFilter } from './date-range-filter'
import type { DashboardFilters } from '@/lib/supabase/types'

interface DateRangeSelectorProps {
	filters: DashboardFilters
	onFiltersChange: (filters: Partial<DashboardFilters>) => void
}

/**
 * Date Range Selector - Standalone date range picker for page header
 *
 * Features:
 * - Date range selection (from/to)
 * - Compact layout for page header
 * - Uses same DateRangeFilter component
 */
export function DateRangeSelector({
	filters,
	onFiltersChange,
}: DateRangeSelectorProps) {
	return (
		<div className='w-full sm:w-auto'>
			<DateRangeFilter
				from={filters.dateRange.from}
				to={filters.dateRange.to}
				onChange={(from, to) => onFiltersChange({ dateRange: { from, to } })}
			/>
		</div>
	)
}
