'use client'

import { usePaginatedTickets } from '@/lib/hooks/use-paginated-tickets'
import { useTicketsReviewFilters } from '@/lib/store/hooks/use-tickets-review-filters'
import { useTranslations } from 'next-intl'
import { TicketsReviewTable } from './tables/tickets-review-table'
import { FilterSheet } from './filters/filter-sheet'
import { TicketsReviewFilterBar } from './filters/tickets-review-filter-bar'
import { TicketsReviewDateRangeSelector } from './filters/tickets-review-date-range-selector'
import { TicketsReviewSkeleton } from './loading/tickets-review-skeleton'

/**
 * Tickets Review Content - Client Component
 *
 * Features:
 * - Filters (date, category, version, classification, agent, status)
 * - Table with ticket data
 * - Incremental loading (60 records per batch)
 * - Session storage caching
 */
export function TicketsReviewContent() {
	const t = useTranslations()

	const {
		filters,
		setDateRange,
		setCategories,
		setVersions,
		setClassifications,
		setAgents,
		setStatuses,
		resetFilters,
	} = useTicketsReviewFilters()

	// Fetch paginated tickets (60 records per batch, cached in session)
	const {
		allLoadedTickets,
		hasMore,
		isLoadingInitial,
		isFetchingMore,
		loadNextBatch,
	} = usePaginatedTickets()

	// Count active filters (excluding date range, which has its own selector)
	const getActiveFilterCount = () => {
		let count = 0

		if (filters.categories.length > 0) count++
		if (filters.versions.length > 0) count++
		if (filters.classifications.length > 0) count++
		if (filters.agents.length > 0) count++
		if (filters.reviewStatuses.length > 0) count++

		return count
	}

	// Show loading state
	if (isLoadingInitial) {
		return <TicketsReviewSkeleton />
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Filters Section */}
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
				{/* More Filters Button - First on large screens, top on mobile */}
				<div className='lg:order-1'>
					<FilterSheet
						title={t('ticketsReview.filters.title')}
						description={t('ticketsReview.description')}
						activeFilterCount={getActiveFilterCount()}
					>
						<TicketsReviewFilterBar
							filters={filters}
							onCategoriesChange={setCategories}
							onVersionsChange={setVersions}
							onClassificationsChange={setClassifications}
							onAgentsChange={setAgents}
							onStatusesChange={setStatuses}
							onReset={resetFilters}
						/>
					</FilterSheet>
				</div>

				{/* Date Range Selector - Fills remaining space on large screens */}
				<div className='lg:order-2 lg:flex-1'>
					<TicketsReviewDateRangeSelector
						from={filters.dateRange.from}
						to={filters.dateRange.to}
						onDateRangeChange={setDateRange}
					/>
				</div>
			</div>

			{/* Tickets Table */}
			<TicketsReviewTable
				data={allLoadedTickets}
				hasMore={hasMore}
				isFetchingMore={isFetchingMore}
				onLoadMore={loadNextBatch}
			/>
		</div>
	)
}
