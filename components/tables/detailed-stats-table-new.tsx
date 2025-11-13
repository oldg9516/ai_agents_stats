/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { TableSkeleton } from '@/components/loading/table-skeleton'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { getCategoryLabel } from '@/constants/category-labels'
import { useDetailedStatsPaginated } from '@/lib/queries/dashboard-queries'
import type { DashboardFilters, DetailedStatsRow } from '@/lib/supabase/types'
import { exportToCSV } from '@/lib/utils/export'
import {
	IconChevronLeft,
	IconChevronRight,
	IconDownload,
	IconLoader2,
	IconSearch,
} from '@tabler/icons-react'
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface DetailedStatsTableNewProps {
	filters: DashboardFilters
}

/**
 * Detailed Stats Table NEW - Hierarchical table with version and week-level data
 *
 * Differences from old table:
 * - HIDES "Good %" (OLD) column
 * - Shows only AI Success Rate (NEW) and AI Failure Rate (NEW)
 *
 * Features:
 * - Server-side pagination (50 rows per page)
 * - Sorting (client-side on current page)
 * - Search by category (client-side on current page)
 * - CSV export (current page)
 * - Quality color coding
 * - Click on category (version-level rows) to view details
 */
export function DetailedStatsTableNew({ filters }: DetailedStatsTableNewProps) {
	const t = useTranslations()
	const router = useRouter()

	// Server-side pagination state
	const [currentPage, setCurrentPage] = useState(0)
	const pageSize = 50

	// Fetch paginated data
	const {
		data,
		totalCount,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		isLoading,
		error,
		isFetching,
	} = useDetailedStatsPaginated(filters, currentPage, pageSize)

	// Client-side sorting and filtering (on current page only)
	const [sorting, setSorting] = useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = useState('')

	// Handle category click
	const handleCategoryClick = (category: string) => {
		router.push(`/dashboard-new/category/${encodeURIComponent(category)}`)
	}

	// Helper to check if date is after new logic cutoff (11.11.2025)
	const isNewLogic = (dates: string | null): boolean => {
		if (!dates) return false // Version-level rows don't have dates

		// Extract SECOND date (end of week) from "DD.MM.YYYY — DD.MM.YYYY" format
		const secondDate = dates.split(' — ')[1]
		const [day, month, year] = secondDate.split('.')
		const dateObj = new Date(`${year}-${month}-${day}`)
		const cutoffDate = new Date('2025-11-11')

		return dateObj >= cutoffDate
	}

	// Calculate AI metrics
	const calculateAIMetrics = (row: DetailedStatsRow) => {
		const total = row.recordsQualifiedAgents
		if (total === 0) return { failureRate: 0, successRate: 0 }

		const failureRate =
			((row.criticalErrors + row.meaningfulImprovements) / total) * 100
		const successRate =
			((row.noSignificantChanges + row.stylisticPreferences) / total) * 100

		return { failureRate, successRate }
	}

	// Define columns (WITHOUT "Good %" column)
	const columns = useMemo<ColumnDef<DetailedStatsRow>[]>(
		() => [
			{
				accessorKey: 'category',
				header: t('table.category'),
				cell: ({ row }) => {
					const isVersionLevel = row.original.sortOrder === 1
					const category = row.original.category

					if (isVersionLevel) {
						return (
							<div
								className='font-semibold cursor-pointer hover:text-primary transition-colors'
								onClick={() => handleCategoryClick(category)}
							>
								{getCategoryLabel(category)}
							</div>
						)
					}

					return (
						<div className='pl-4 text-muted-foreground'>
							{getCategoryLabel(category)}
						</div>
					)
				},
			},
			{
				accessorKey: 'version',
				header: t('table.version'),
				cell: ({ row }) => {
					const isVersionLevel = row.original.sortOrder === 1
					return (
						<div
							className={
								isVersionLevel ? 'font-semibold' : 'text-muted-foreground'
							}
						>
							{row.original.version}
						</div>
					)
				},
			},
			{
				accessorKey: 'dates',
				header: t('table.dates'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					return <div className='text-sm'>{value || '-'}</div>
				},
				sortingFn: (rowA, rowB, columnId) => {
					const dateA = rowA.getValue(columnId) as string | null
					const dateB = rowB.getValue(columnId) as string | null

					if (!dateA && !dateB) return 0
					if (!dateA) return -1
					if (!dateB) return 1

					const firstDateA = dateA.split(' — ')[0]
					const firstDateB = dateB.split(' — ')[0]

					const [dayA, monthA, yearA] = firstDateA.split('.')
					const [dayB, monthB, yearB] = firstDateB.split('.')
					const dateStrA = `${yearA}-${monthA}-${dayA}`
					const dateStrB = `${yearB}-${monthB}-${dayB}`

					return dateStrA.localeCompare(dateStrB)
				},
			},
			{
				accessorKey: 'totalRecords',
				header: t('table.totalRecords'),
				cell: ({ getValue }) => {
					return <div className='text-left'>{getValue() as number}</div>
				},
			},
			{
				accessorKey: 'recordsQualifiedAgents',
				header: t('table.qualifiedAgents'),
				cell: ({ getValue }) => {
					return <div className='text-left'>{getValue() as number}</div>
				},
			},
			{
				accessorKey: 'changedRecords',
				header: t('table.recordsChanged'),
				cell: ({ getValue }) => {
					return <div className='text-left'>{getValue() as number}</div>
				},
			},
			// AI FAILURE RATE (NEW) - Only show for weeks after 11.11.2025
			{
				accessorKey: 'aiFailureRate',
				header: () => (
					<div className='text-center text-xs'>
						{t('table.aiFailureRate')}
						<div className='text-[10px] text-muted-foreground font-normal'>
							(NEW)
						</div>
					</div>
				),
				cell: ({ row }) => {
					const isVersionLevel = row.original.sortOrder === 1
					const dates = row.original.dates

					// For version-level rows, show aggregate if any weeks have new logic
					if (isVersionLevel) {
						const { failureRate } = calculateAIMetrics(row.original)
						const total = row.original.recordsQualifiedAgents

						// Color coding: red > 30%, orange 15-30%, green < 15%
						const bgClass =
							failureRate > 30
								? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
								: failureRate > 15
								? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
								: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'

						return (
							<div className='flex justify-left'>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<span
												className={`inline-block px-2 py-1 rounded text-sm font-medium cursor-help ${bgClass}`}
											>
												{failureRate.toFixed(1)}%
											</span>
										</TooltipTrigger>
										<TooltipContent side='bottom' className='max-w-xs'>
											<div className='space-y-1 text-xs'>
												<div className='font-semibold mb-2'>
													AI Failure Breakdown:
												</div>
												<div className='flex justify-between gap-4'>
													<span className='text-red-600 dark:text-red-400'>
														🔴 Critical Errors:
													</span>
													<span className='font-medium'>
														{row.original.criticalErrors} (
														{total > 0
															? ((row.original.criticalErrors / total) * 100).toFixed(1)
															: 0}
														%)
													</span>
												</div>
												<div className='flex justify-between gap-4'>
													<span className='text-orange-600 dark:text-orange-400'>
														🟠 Meaningful Improvements:
													</span>
													<span className='font-medium'>
														{row.original.meaningfulImprovements} (
														{total > 0
															? ((row.original.meaningfulImprovements / total) * 100).toFixed(1)
															: 0}
														%)
													</span>
												</div>
												<div className='border-t pt-1 mt-1'>
													<div className='flex justify-between gap-4 font-semibold'>
														<span>Total Failures:</span>
														<span>
															{row.original.criticalErrors + row.original.meaningfulImprovements}
														</span>
													</div>
												</div>
											</div>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						)
					}

					// For week-level rows, check if after cutoff
					if (!isNewLogic(dates)) {
						return <div className='text-center text-muted-foreground'>—</div>
					}

					const { failureRate } = calculateAIMetrics(row.original)
					const total = row.original.recordsQualifiedAgents

					// Color coding: red > 30%, orange 15-30%, green < 15%
					const bgClass =
						failureRate > 30
							? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
							: failureRate > 15
							? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
							: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'

					return (
						<div className='flex justify-left'>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<span
											className={`inline-block px-2 py-1 rounded text-sm font-medium cursor-help ${bgClass}`}
										>
											{failureRate.toFixed(1)}%
										</span>
									</TooltipTrigger>
									<TooltipContent side='bottom' className='max-w-xs'>
										<div className='space-y-1 text-xs'>
											<div className='font-semibold mb-2'>
												AI Failure Breakdown:
											</div>
											<div className='flex justify-between gap-4'>
												<span className='text-red-600 dark:text-red-400'>
													🔴 Critical Errors:
												</span>
												<span className='font-medium'>
													{row.original.criticalErrors} (
													{total > 0
														? ((row.original.criticalErrors / total) * 100).toFixed(1)
														: 0}
													%)
												</span>
											</div>
											<div className='flex justify-between gap-4'>
												<span className='text-orange-600 dark:text-orange-400'>
													🟠 Meaningful Improvements:
												</span>
												<span className='font-medium'>
													{row.original.meaningfulImprovements} (
													{total > 0
														? ((row.original.meaningfulImprovements / total) * 100).toFixed(1)
														: 0}
													%)
												</span>
											</div>
											<div className='border-t pt-1 mt-1'>
												<div className='flex justify-between gap-4 font-semibold'>
													<span>Total Failures:</span>
													<span>
														{row.original.criticalErrors + row.original.meaningfulImprovements}
													</span>
												</div>
											</div>
										</div>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					)
				},
			},
			// AI SUCCESS RATE (NEW) - Only show for weeks after 11.11.2025
			{
				accessorKey: 'aiSuccessRate',
				header: () => (
					<div className='text-center text-xs'>
						{t('table.aiSuccessRate')}
						<div className='text-[10px] text-muted-foreground font-normal'>
							(NEW)
						</div>
					</div>
				),
				cell: ({ row }) => {
					const isVersionLevel = row.original.sortOrder === 1
					const dates = row.original.dates

					// For version-level rows, show aggregate if any weeks have new logic
					if (isVersionLevel) {
						const { successRate } = calculateAIMetrics(row.original)
						const total = row.original.recordsQualifiedAgents

						// Color coding: green > 70%, orange 50-70%, red < 50%
						const bgClass =
							successRate > 70
								? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
								: successRate > 50
								? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
								: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'

						return (
							<div className='flex justify-left'>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<span
												className={`inline-block px-2 py-1 rounded text-sm font-medium cursor-help ${bgClass}`}
											>
												{successRate.toFixed(1)}%
											</span>
										</TooltipTrigger>
										<TooltipContent side='bottom' className='max-w-xs'>
											<div className='space-y-1 text-xs'>
												<div className='font-semibold mb-2'>
													AI Success Breakdown:
												</div>
												<div className='flex justify-between gap-4'>
													<span className='text-blue-600 dark:text-blue-400'>
														🔵 No Significant Change:
													</span>
													<span className='font-medium'>
														{row.original.noSignificantChanges} (
														{total > 0
															? ((row.original.noSignificantChanges / total) * 100).toFixed(1)
															: 0}
														%)
													</span>
												</div>
												<div className='flex justify-between gap-4'>
													<span className='text-green-600 dark:text-green-400'>
														🟢 Stylistic Preference:
													</span>
													<span className='font-medium'>
														{row.original.stylisticPreferences} (
														{total > 0
															? ((row.original.stylisticPreferences / total) * 100).toFixed(1)
															: 0}
														%)
													</span>
												</div>
												<div className='border-t pt-1 mt-1'>
													<div className='flex justify-between gap-4 font-semibold'>
														<span>Total Successes:</span>
														<span>
															{row.original.noSignificantChanges + row.original.stylisticPreferences}
														</span>
													</div>
												</div>
											</div>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						)
					}

					// For week-level rows, check if after cutoff
					if (!isNewLogic(dates)) {
						return <div className='text-center text-muted-foreground'>—</div>
					}

					const { successRate } = calculateAIMetrics(row.original)
					const total = row.original.recordsQualifiedAgents

					// Color coding: green > 70%, orange 50-70%, red < 50%
					const bgClass =
						successRate > 70
							? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
							: successRate > 50
							? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
							: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'

					return (
						<div className='flex justify-left'>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<span
											className={`inline-block px-2 py-1 rounded text-sm font-medium cursor-help ${bgClass}`}
										>
											{successRate.toFixed(1)}%
										</span>
									</TooltipTrigger>
									<TooltipContent side='bottom' className='max-w-xs'>
										<div className='space-y-1 text-xs'>
											<div className='font-semibold mb-2'>
												AI Success Breakdown:
											</div>
											<div className='flex justify-between gap-4'>
												<span className='text-blue-600 dark:text-blue-400'>
													🔵 No Significant Change:
												</span>
												<span className='font-medium'>
													{row.original.noSignificantChanges} (
													{total > 0
														? ((row.original.noSignificantChanges / total) * 100).toFixed(1)
														: 0}
													%)
												</span>
											</div>
											<div className='flex justify-between gap-4'>
												<span className='text-green-600 dark:text-green-400'>
													🟢 Stylistic Preference:
												</span>
												<span className='font-medium'>
													{row.original.stylisticPreferences} (
													{total > 0
														? ((row.original.stylisticPreferences / total) * 100).toFixed(1)
														: 0}
													%)
												</span>
											</div>
											<div className='border-t pt-1 mt-1'>
												<div className='flex justify-between gap-4 font-semibold'>
													<span>Total Successes:</span>
													<span>
														{row.original.noSignificantChanges + row.original.stylisticPreferences}
													</span>
												</div>
											</div>
										</div>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					)
				},
			},
		],
		[t]
	)

	// Find the latest week for each category (to highlight)
	const latestWeeksByCategory = useMemo(() => {
		const latestMap = new Map<string, string>()

		if (!data) return latestMap

		data.forEach(row => {
			// Only process week-level rows (sortOrder !== 1)
			if (row.sortOrder !== 1 && row.dates) {
				const key = `${row.category}-${row.version}`
				const firstDate = row.dates.split(' — ')[0]
				const [day, month, year] = firstDate.split('.')
				const dateStr = `${year}-${month}-${day}`

				// If no date for this key yet, or current date is more recent
				const currentLatest = latestMap.get(key)
				if (!currentLatest || dateStr > currentLatest) {
					latestMap.set(key, dateStr)
				}
			}
		})

		return latestMap
	}, [data])

	// Helper to check if a row is the latest week for its category
	const isLatestWeek = (row: DetailedStatsRow): boolean => {
		if (row.sortOrder === 1 || !row.dates) return false

		const key = `${row.category}-${row.version}`
		const firstDate = row.dates.split(' — ')[0]
		const [day, month, year] = firstDate.split('.')
		const dateStr = `${year}-${month}-${day}`

		return latestWeeksByCategory.get(key) === dateStr
	}

	// Create table instance
	const table = useReactTable({
		data: data || [],
		columns,
		state: {
			sorting,
			globalFilter,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: (row, columnId, filterValue) => {
			const category = getCategoryLabel(row.original.category).toLowerCase()
			const search = filterValue.toLowerCase()
			return category.includes(search)
		},
		manualPagination: true,
		pageCount: totalPages,
	})

	// CSV Export (current page only)
	const handleExport = () => {
		const csvData = (data || []).map(row => ({
			Category: getCategoryLabel(row.category),
			Version: row.version,
			Dates: row.dates || '-',
			'Total Records': row.totalRecords,
			'Qualified Agents': row.recordsQualifiedAgents,
			'Records Changed': row.changedRecords,
			'AI Failure Rate (%)': isNewLogic(row.dates)
				? calculateAIMetrics(row).failureRate.toFixed(1)
				: '-',
			'AI Success Rate (%)': isNewLogic(row.dates)
				? calculateAIMetrics(row).successRate.toFixed(1)
				: '-',
		}))

		exportToCSV(csvData as any, 'detailed-stats-new.csv')
	}

	// Pagination handlers
	const goToNextPage = () => {
		if (hasNextPage) {
			setCurrentPage(prev => prev + 1)
		}
	}

	const goToPreviousPage = () => {
		if (hasPreviousPage) {
			setCurrentPage(prev => prev - 1)
		}
	}

	const goToFirstPage = () => {
		setCurrentPage(0)
	}

	const goToLastPage = () => {
		setCurrentPage(totalPages - 1)
	}

	// Loading state
	if (isLoading) {
		return <TableSkeleton />
	}

	// Error state
	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t('table.detailedStats')}</CardTitle>
					<CardDescription>
						{t('table.detailedStatsDescription')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex flex-col items-center justify-center min-h-[200px] gap-2'>
						<div className='text-destructive font-semibold'>
							{t('errors.loadingTable')}
						</div>
						<div className='text-sm text-muted-foreground'>{error.message}</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle>{t('table.detailedStats')}</CardTitle>
						<CardDescription>
							{t('table.detailedStatsDescription')}
						</CardDescription>
					</div>
					<Button variant='outline' size='sm' onClick={handleExport}>
						<IconDownload className='h-4 w-4 mr-2' />
						{t('common.export')}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{/* Search Bar */}
				<div className='flex items-center gap-2 mb-4'>
					<div className='relative flex-1'>
						<IconSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
						<Input
							placeholder={t('table.searchCategory')}
							value={globalFilter}
							onChange={e => setGlobalFilter(e.target.value)}
							className='pl-9'
						/>
					</div>
					{isFetching && (
						<IconLoader2 className='h-4 w-4 animate-spin text-muted-foreground' />
					)}
				</div>

				{/* Table */}
				<div className='border rounded-md'>
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map(header => (
										<TableHead
											key={header.id}
											className={
												header.column.getCanSort()
													? 'cursor-pointer select-none'
													: ''
											}
											onClick={header.column.getToggleSortingHandler()}
										>
											{header.isPlaceholder ? null : (
												<div className='flex items-center gap-2'>
													{flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
													{header.column.getIsSorted() === 'asc' && (
														<span>↑</span>
													)}
													{header.column.getIsSorted() === 'desc' && (
														<span>↓</span>
													)}
												</div>
											)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className='h-24 text-center'
									>
										{t('common.noDataAvailable')}
									</TableCell>
								</TableRow>
							) : (
								table.getRowModel().rows.map(row => {
									const isVersion = row.original.sortOrder === 1
									const isLatest = isLatestWeek(row.original)

									return (
										<TableRow
											key={row.id}
											className={
												isVersion
													? 'bg-muted/50'
													: isLatest
													? 'bg-blue-50/50 dark:bg-blue-950/20 border-l-2 border-l-blue-500'
													: ''
											}
										>
											{row.getVisibleCells().map(cell => (
												<TableCell key={cell.id}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext()
													)}
												</TableCell>
											))}
										</TableRow>
									)
								})
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<div className='flex items-center justify-between mt-4'>
					<div className='text-sm text-muted-foreground'>
						{t('table.showingRecords', {
							from: currentPage * pageSize + 1,
							to: Math.min((currentPage + 1) * pageSize, totalCount),
							total: totalCount,
						})}
					</div>
					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={goToFirstPage}
							disabled={!hasPreviousPage || isFetching}
						>
							{t('table.firstPage')}
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={goToPreviousPage}
							disabled={!hasPreviousPage || isFetching}
						>
							<IconChevronLeft className='h-4 w-4' />
						</Button>
						<div className='text-sm'>
							{t('table.pageOf', {
								current: currentPage + 1,
								total: totalPages,
							})}
						</div>
						<Button
							variant='outline'
							size='sm'
							onClick={goToNextPage}
							disabled={!hasNextPage || isFetching}
						>
							<IconChevronRight className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={goToLastPage}
							disabled={!hasNextPage || isFetching}
						>
							{t('table.lastPage')}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
