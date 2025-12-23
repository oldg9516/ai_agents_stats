'use client'

import { useBacklogReportsFilters } from '@/lib/store/hooks'
import { useTranslations } from 'next-intl'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'
import { DateRangeFilter } from '../filters/date-range-filter'
import { IconRefresh, IconSearch } from '@tabler/icons-react'
import { useDebouncedCallback } from 'use-debounce'

/**
 * Reports Filter Bar - Filters for backlog reports list
 *
 * Filters:
 * - Date range picker (when reports were generated)
 * - Period days select (7, 14, 30, or all)
 * - Search input (searches in executive summary)
 * - Reset button
 */
export function ReportsFilterBar() {
	const t = useTranslations()

	const {
		filters: backlogReportsFilters,
		setDateRange: setBacklogReportsDateRange,
		setPeriodDays: setBacklogReportsPeriodDays,
		setSearchQuery: setBacklogReportsSearchQuery,
		resetFilters: resetBacklogReportsFilters,
	} = useBacklogReportsFilters()

	// Debounce search to avoid too many queries
	const debouncedSearch = useDebouncedCallback((query: string) => {
		setBacklogReportsSearchQuery(query)
	}, 300)

	// Handle date range change
	const handleDateRangeChange = (from: Date, to: Date) => {
		setBacklogReportsDateRange(from, to)
	}

	// Handle period change
	const handlePeriodChange = (value: string) => {
		setBacklogReportsPeriodDays(value === 'all' ? null : parseInt(value, 10))
	}

	return (
		<div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap'>
			{/* Date Range Picker */}
			<div className='flex flex-col gap-1.5'>
				<Label className='text-sm'>{t('backlogReports.filters.dateRange')}</Label>
				<DateRangeFilter
					from={backlogReportsFilters.dateRange.from}
					to={backlogReportsFilters.dateRange.to}
					onChange={handleDateRangeChange}
				/>
			</div>

			{/* Period Select */}
			<div className='flex flex-col gap-1.5'>
				<Label className='text-sm'>{t('backlogReports.filters.period')}</Label>
				<Select
					value={
						backlogReportsFilters.periodDays?.toString() ?? 'all'
					}
					onValueChange={handlePeriodChange}
				>
					<SelectTrigger className='w-[140px]'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>
							{t('backlogReports.filters.allPeriods')}
						</SelectItem>
						<SelectItem value='7'>7 {t('backlogReports.card.days')}</SelectItem>
						<SelectItem value='14'>14 {t('backlogReports.card.days')}</SelectItem>
						<SelectItem value='30'>30 {t('backlogReports.card.days')}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Search Input */}
			<div className='flex flex-col gap-1.5 flex-1 min-w-[200px]'>
				<Label className='text-sm'>{t('backlogReports.filters.search')}</Label>
				<div className='relative'>
					<IconSearch className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder={t('backlogReports.filters.searchPlaceholder')}
						defaultValue={backlogReportsFilters.searchQuery}
						onChange={e => debouncedSearch(e.target.value)}
						className='pl-9'
					/>
				</div>
			</div>

			{/* Reset Button */}
			<Button
				variant='outline'
				size='icon'
				onClick={resetBacklogReportsFilters}
				title={t('filters.resetFilters')}
			>
				<IconRefresh className='h-4 w-4' />
			</Button>
		</div>
	)
}
