'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSubscriptionFilters } from '@/lib/store/hooks/use-subscription-filters'
import { usePaginatedSubscription } from '@/lib/hooks/use-paginated-subscription'
import { DateRangeFilter } from '@/components/filters/date-range-filter'
import { RetentionTable } from '@/components/tables/retention-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { IconSearch } from '@tabler/icons-react'
import type { RetentionOutcome } from '@/lib/db/types'

const OUTCOMES: RetentionOutcome[] = ['auto_reply', 'draft', 'auto_close']

export function SubscriptionContent() {
	// Shared field/table strings come from the 'retention' namespace;
	// only the page title/description are subscription-specific.
	const t = useTranslations('retention')
	const tPage = useTranslations('subscription')
	const { filters, setDateRange, updateFilters } = useSubscriptionFilters()
	const { items, hasMore, isLoadingInitial, isFetchingMore, loadNextBatch } =
		usePaginatedSubscription()

	const [searchInput, setSearchInput] = useState(filters.searchQuery)

	const applySearch = () => updateFilters({ searchQuery: searchInput.trim() })

	const toggleOutcome = (value: RetentionOutcome) => {
		const next = filters.outcomes.includes(value)
			? filters.outcomes.filter(o => o !== value)
			: [...filters.outcomes, value]
		updateFilters({ outcomes: next })
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			<div>
				<h1 className='text-2xl font-semibold'>{tPage('title')}</h1>
				<p className='text-sm text-muted-foreground mt-1'>{tPage('description')}</p>
			</div>

			<div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap'>
				<div className='lg:flex-1 lg:min-w-[280px]'>
					<DateRangeFilter
						from={filters.dateRange.from}
						to={filters.dateRange.to}
						onChange={setDateRange}
					/>
				</div>

				<div className='flex gap-2'>
					<Input
						value={searchInput}
						onChange={e => setSearchInput(e.target.value)}
						onKeyDown={e => e.key === 'Enter' && applySearch()}
						placeholder={t('table.searchPlaceholder')}
						className='w-full lg:w-[320px]'
					/>
					<Button variant='outline' size='icon' onClick={applySearch}>
						<IconSearch className='h-4 w-4' />
					</Button>
				</div>
			</div>

			<div className='flex flex-wrap items-center gap-3'>
				<div className='flex items-center gap-2'>
					<span className='text-xs text-muted-foreground'>{t('table.outcome')}:</span>
					<ToggleGroup type='multiple' value={filters.outcomes} variant='outline' size='sm'>
						{OUTCOMES.map(o => (
							<ToggleGroupItem key={o} value={o} onClick={() => toggleOutcome(o)}>
								{t(`outcome.${o}`)}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</div>

				<div className='flex items-center gap-2'>
					<span className='text-xs text-muted-foreground'>{t('table.outstanding')}:</span>
					<ToggleGroup
						type='single'
						value={filters.outstanding}
						variant='outline'
						size='sm'
						onValueChange={v => v && updateFilters({ outstanding: v as 'all' | 'yes' | 'no' })}
					>
						<ToggleGroupItem value='all'>{t('filter.all')}</ToggleGroupItem>
						<ToggleGroupItem value='yes'>{t('yes')}</ToggleGroupItem>
						<ToggleGroupItem value='no'>{t('no')}</ToggleGroupItem>
					</ToggleGroup>
				</div>
			</div>

			{isLoadingInitial ? (
				<Card>
					<CardContent className='py-6'>
						<Skeleton className='h-[400px] w-full' />
					</CardContent>
				</Card>
			) : (
				<RetentionTable
					data={items}
					hasMore={hasMore}
					isFetchingMore={isFetchingMore}
					onLoadMore={loadNextBatch}
					basePath='/subscription'
				/>
			)}
		</div>
	)
}
