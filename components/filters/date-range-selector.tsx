'use client'

import { DateRangeFilter } from './date-range-filter'
import type { DashboardFilters, DateFilterMode } from '@/lib/supabase/types'

interface DateRangeSelectorProps {
	filters: DashboardFilters
	onFiltersChange: (filters: Partial<DashboardFilters>) => void
	dateFilterMode?: DateFilterMode
	onDateFilterModeChange?: (mode: DateFilterMode) => void
}

/**
 * Date Range Selector - Standalone date range picker for page header
 *
 * Features:
 * - Date range selection (from/to)
 * - Date filter mode toggle (created_at vs human_reply_date)
 * - Compact layout for page header
 * - Uses same DateRangeFilter component
 */
export function DateRangeSelector({
	filters,
	onFiltersChange,
	dateFilterMode = 'created',
	onDateFilterModeChange,
}: DateRangeSelectorProps) {
	return (
		<div className='w-full sm:w-auto'>
			<DateRangeFilter
				from={filters.dateRange.from}
				to={filters.dateRange.to}
				onChange={(from, to) => onFiltersChange({ dateRange: { from, to } })}
				dateFilterMode={dateFilterMode}
				onDateFilterModeChange={onDateFilterModeChange}
			/>
		</div>
	)
}
