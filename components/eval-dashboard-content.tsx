'use client'

import { useTranslations } from 'next-intl'
import { useEvalFilters } from '@/lib/store/hooks/use-eval-filters'
import { useEvalIntentTable } from '@/lib/queries/eval-queries'
import { DateRangeFilter } from '@/components/filters/date-range-filter'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EvalIntentTable } from '@/components/eval-intent-table'

/**
 * Eval Dashboard Content — main client component
 *
 * Layout:
 * 1. Date range filter
 * 2. Intent readiness table (PRIMARY view)
 */
export function EvalDashboardContent() {
	const t = useTranslations('evalDashboard')
	const tCommon = useTranslations('common')
	const { filters, setDateRange } = useEvalFilters()
	const { data, isLoading, error } = useEvalIntentTable(filters)

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Date Range Filter */}
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
				<DateRangeFilter
					from={filters.dateRange.from}
					to={filters.dateRange.to}
					onChange={(from, to) => setDateRange(from, to)}
				/>
			</div>

			{/* Intent Table */}
			{isLoading ? (
				<Card>
					<CardContent className='p-6'>
						<div className='space-y-3'>
							<Skeleton className='h-8 w-full' />
							{[1, 2, 3, 4, 5].map(i => (
								<Skeleton key={i} className='h-12 w-full' />
							))}
						</div>
					</CardContent>
				</Card>
			) : error ? (
				<Card>
					<CardContent className='py-8 text-center text-muted-foreground'>
						{tCommon('error.fetchFailed')}
					</CardContent>
				</Card>
			) : !data || data.length === 0 ? (
				<Card>
					<CardContent className='py-8 text-center text-muted-foreground'>
						{tCommon('noDataAvailable')}
					</CardContent>
				</Card>
			) : (
				<EvalIntentTable data={data} />
			)}
		</div>
	)
}
