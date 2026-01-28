'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { fetchSubcategoriesData } from '@/lib/actions/subcategories-actions'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import type { CategoryGroup } from '@/lib/supabase/queries-subcategories'
import { useQuery } from '@tanstack/react-query'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangeSelector } from '@/components/filters/date-range-selector'
import { MultiSelectFilter } from '@/components/filters/multi-select-filter'
import { Button } from '@/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getClassificationColor } from '@/constants/classification-types'

export function SubcategoriesStatsContent() {
	const t = useTranslations('subcategoriesStats')
	const tCommon = useTranslations('common')
	const tFilters = useTranslations('filters')

	// Filters
	const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
		from: new Date(new Date().setDate(new Date().getDate() - 30)),
		to: new Date(),
	})
	const [selectedVersions, setSelectedVersions] = useState<string[]>([])
	const [selectedAgents, setSelectedAgents] = useState<string[]>([])

	// Fetch filter options
	const { data: filterOptions } = useQuery({
		queryKey: [
			'filterOptions',
			dateRange.from.toISOString(),
			dateRange.to.toISOString(),
		],
		queryFn: () => fetchFilterOptions(dateRange),
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	})

	// Fetch subcategories data
	const {
		data = [],
		isLoading: loading,
		error,
		refetch,
	} = useQuery({
		queryKey: [
			'subcategoriesStats',
			dateRange,
			selectedVersions,
			selectedAgents,
		],
		queryFn: () =>
			fetchSubcategoriesData({
				dateRange,
				versions: selectedVersions.length > 0 ? selectedVersions : undefined,
				agents: selectedAgents.length > 0 ? selectedAgents : undefined,
			}),
		staleTime: 2 * 60 * 1000, // 2 min
	})

	return (
		<div className='min-h-screen p-4 sm:p-6 space-y-6'>
			{/* Header */}
			<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl sm:text-3xl font-bold'>{t('title')}</h1>
					<p className='text-sm text-muted-foreground mt-1'>
						{t('description')}
					</p>
				</div>
				<Button onClick={() => refetch()} disabled={loading} size='sm'>
					<IconRefresh className='h-4 w-4 mr-2' />
					{tCommon('refresh')}
				</Button>
			</div>

			{/* Date Range Selector */}
			<DateRangeSelector
				filters={{ dateRange, versions: [], categories: [], agents: [] }}
				onFiltersChange={(updates) => {
					if (updates.dateRange) {
						setDateRange(updates.dateRange)
					}
				}}
				dateFilterMode='created'
			/>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle>{tFilters('title')}</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{/* Version Filter */}
						<MultiSelectFilter
							label={tFilters('versions')}
							placeholder={tFilters('searchVersions')}
							options={filterOptions?.versions || []}
							selected={selectedVersions}
							onChange={setSelectedVersions}
						/>

						{/* Agent Filter */}
						<MultiSelectFilter
							label={tFilters('agents')}
							placeholder={tFilters('searchAgents')}
							options={filterOptions?.agents || []}
							selected={selectedAgents}
							onChange={setSelectedAgents}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Summary Stats */}
			{!loading && data.length > 0 && (
				<div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
					<Card>
						<CardHeader className='pb-3'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								{t('totalCategories')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-2xl font-bold'>{data.length}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-3'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								{t('totalSubcategories')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-2xl font-bold'>
								{data.reduce((sum, cat) => sum + cat.subcategories.length, 0)}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-3'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								{t('overallQuality')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-2xl font-bold'>
								{data.length > 0
									? Math.round(
											data.reduce((sum, cat) => sum + cat.quality_percentage, 0) /
												data.length
									  )
									: 0}
								%
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Loading State */}
			{loading && (
				<div className='space-y-4'>
					<Skeleton className='h-32 w-full' />
					<Skeleton className='h-32 w-full' />
					<Skeleton className='h-32 w-full' />
				</div>
			)}

			{/* Error State */}
			{error && (
				<Card>
					<CardContent className='pt-6'>
						<p className='text-center text-destructive'>
							{tCommon('error.fetchFailed')}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Data Display */}
			{!loading && !error && data.length === 0 && (
				<Card>
					<CardContent className='pt-6'>
						<p className='text-center text-muted-foreground'>
							{tCommon('noData')}
						</p>
					</CardContent>
				</Card>
			)}

			{!loading && !error && data.length > 0 && (
				<Accordion type='multiple' className='space-y-4'>
					{data.map((category, index) => (
						<AccordionItem
							key={category.category}
							value={category.category}
							className={`border rounded-lg px-4 ${
								index === data.length - 1 ? 'mb-6' : ''
							}`}
						>
							<AccordionTrigger className='hover:no-underline'>
								<div className='flex items-center justify-between w-full pr-4'>
									<div className='flex items-center gap-4'>
										<span className='text-lg font-semibold'>
											{category.category}
										</span>
										<span className='text-sm text-muted-foreground'>
											{category.subcategories.length}{' '}
											{t('subcategories').toLowerCase()}
										</span>
									</div>
									<div className='flex items-center gap-4'>
										<span className='text-sm text-muted-foreground'>
											{t('total')}: {category.total}
										</span>
										<span
											className={`px-3 py-1 rounded-full text-sm font-medium ${
												category.quality_percentage >= 70
													? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
													: category.quality_percentage >= 40
													? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
													: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
											}`}
										>
											{category.quality_percentage}%
										</span>
									</div>
								</div>
							</AccordionTrigger>
							<AccordionContent className='pt-4'>
								<div className='space-y-3'>
									{category.subcategories.map(subcategory => (
										<Card key={subcategory.subcategory}>
											<CardContent className='pt-6'>
												<div className='space-y-4'>
													{/* Subcategory Header */}
													<div className='flex items-center justify-between'>
														<h4 className='font-semibold text-base'>
															{subcategory.subcategory}
														</h4>
														<span
															className={`px-3 py-1 rounded-full text-sm font-medium ${
																subcategory.quality_percentage >= 70
																	? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
																	: subcategory.quality_percentage >= 40
																	? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
																	: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
															}`}
														>
															{subcategory.quality_percentage}% {t('quality')}
														</span>
													</div>

													{/* Stats Grid */}
													<div className='grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm'>
														<div>
															<p className='text-muted-foreground'>{t('total')}</p>
															<p className='font-semibold'>{subcategory.total}</p>
														</div>
														<div>
															<p className='text-muted-foreground'>{t('changed')}</p>
															<p className='font-semibold'>{subcategory.changed}</p>
														</div>
														<div>
															<p className='text-muted-foreground'>
																{t('unchanged')}
															</p>
															<p className='font-semibold'>
																{subcategory.unchanged}
															</p>
														</div>
													</div>

													{/* Classification Breakdown */}
													<div>
														<p className='text-sm font-medium mb-2'>
															{t('classificationBreakdown')}
														</p>
														<div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
															{subcategory.critical_error > 0 && (
																<div
																	className={`px-3 py-2 rounded text-xs ${getClassificationColor(
																		'critical_error'
																	)}`}
																>
																	<span className='font-medium'>
																		{t('criticalError')}:
																	</span>{' '}
																	{subcategory.critical_error}
																</div>
															)}
															{subcategory.meaningful_improvement > 0 && (
																<div
																	className={`px-3 py-2 rounded text-xs ${getClassificationColor(
																		'meaningful_improvement'
																	)}`}
																>
																	<span className='font-medium'>
																		{t('meaningfulImprovement')}:
																	</span>{' '}
																	{subcategory.meaningful_improvement}
																</div>
															)}
															{subcategory.stylistic_preference > 0 && (
																<div
																	className={`px-3 py-2 rounded text-xs ${getClassificationColor(
																		'stylistic_preference'
																	)}`}
																>
																	<span className='font-medium'>
																		{t('stylisticPreference')}:
																	</span>{' '}
																	{subcategory.stylistic_preference}
																</div>
															)}
															{subcategory.no_significant_change > 0 && (
																<div
																	className={`px-3 py-2 rounded text-xs ${getClassificationColor(
																		'no_significant_change'
																	)}`}
																>
																	<span className='font-medium'>
																		{t('noSignificantChange')}:
																	</span>{' '}
																	{subcategory.no_significant_change}
																</div>
															)}
															{subcategory.context_shift > 0 && (
																<div
																	className={`px-3 py-2 rounded text-xs ${getClassificationColor(
																		'context_shift'
																	)}`}
																>
																	<span className='font-medium'>
																		{t('contextShift')}:
																	</span>{' '}
																	{subcategory.context_shift}
																</div>
															)}
														</div>
													</div>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			)}
		</div>
	)
}
