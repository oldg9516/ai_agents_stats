'use client'

import { usePaginatedTickets } from '@/lib/hooks/use-paginated-tickets'
import { useTicketsReviewFilters } from '@/lib/store/hooks/use-tickets-review-filters'
import { getActiveFilterCount } from '@/lib/utils/filter-utils'
import { useTranslations } from 'next-intl'
import { TicketsReviewTable } from './tables/tickets-review-table'
import { FilterSheet } from './filters/filter-sheet'
import { TicketsReviewFilterBar } from './filters/tickets-review-filter-bar'
import { DateRangeFilter } from './filters/date-range-filter'
import { AnalyticsPageLayout } from './layouts/analytics-page-layout'
import { TicketsReviewSkeleton } from './loading/tickets-review-skeleton'

export function TicketsReviewContent() {
	const t = useTranslations()

	const {
		filters,
		setDateRange,
		resetFilters,
		updateFilters,
	} = useTicketsReviewFilters()

	const {
		allLoadedTickets,
		hasMore,
		isLoadingInitial,
		isFetchingMore,
		loadNextBatch,
	} = usePaginatedTickets()

	if (isLoadingInitial) {
		return <TicketsReviewSkeleton />
	}

	return (
		<AnalyticsPageLayout
			filterSheet={
				<FilterSheet
					title={t('ticketsReview.filters.title')}
					description={t('ticketsReview.description')}
					activeFilterCount={getActiveFilterCount(filters)}
				>
					{({ close }) => (
						<TicketsReviewFilterBar
							filters={filters}
							onApplyFilters={updateFilters}
							onReset={resetFilters}
							onClose={close}
						/>
					)}
				</FilterSheet>
			}
			dateRange={
				<DateRangeFilter
					from={filters.dateRange.from}
					to={filters.dateRange.to}
					onChange={setDateRange}
				/>
			}
		>
			<TicketsReviewTable
				data={allLoadedTickets}
				hasMore={hasMore}
				isFetchingMore={isFetchingMore}
				onLoadMore={loadNextBatch}
			/>
		</AnalyticsPageLayout>
	)
}
