'use client'

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
import { getCategoryLabel } from '@/constants/category-labels'
import type { DetailedStatsRow, DashboardFilters } from '@/lib/supabase/types'
import { exportToCSV } from '@/lib/utils/export'
import { getQualityBgClass } from '@/lib/utils/quality-colors'
import { TableSkeleton } from '@/components/loading/table-skeleton'
import {
	IconChevronLeft,
	IconChevronRight,
	IconDownload,
	IconSearch,
	IconLoader2,
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
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useDetailedStatsPaginated } from '@/lib/queries/dashboard-queries'

interface DetailedStatsTableProps {
	filters: DashboardFilters
}

/**
 * Detailed Stats Table - Hierarchical table with version and week-level data
 *
 * Features:
 * - Server-side pagination (50 rows per page)
 * - Sorting (client-side on current page)
 * - Search by category (client-side on current page)
 * - CSV export (current page)
 * - Quality color coding
 * - Click on category (version-level rows) to view details
 */
export function DetailedStatsTable({ filters }: DetailedStatsTableProps) {
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
	// Note: Primary sorting (category → sortOrder → dates DESC) happens on server
	// This is only for optional client-side re-sorting of current page
	const [sorting, setSorting] = useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = useState('')

	// Handle category click
	const handleCategoryClick = (category: string) => {
		router.push(`/dashboard/category/${encodeURIComponent(category)}`)
	}

	// Define columns
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
				// Custom sort function: extract first date from "DD.MM.YYYY — DD.MM.YYYY" format
				// Version-level rows (null dates) should appear first
				sortingFn: (rowA, rowB, columnId) => {
					const dateA = rowA.getValue(columnId) as string | null
					const dateB = rowB.getValue(columnId) as string | null

					// Null dates (version-level rows) always come first
					if (!dateA && !dateB) return 0
					if (!dateA) return -1
					if (!dateB) return 1

					// Extract first date from "DD.MM.YYYY — DD.MM.YYYY" format
					const firstDateA = dateA.split(' — ')[0]
					const firstDateB = dateB.split(' — ')[0]

					// Convert DD.MM.YYYY to YYYY-MM-DD for proper comparison
					const [dayA, monthA, yearA] = firstDateA.split('.')
					const [dayB, monthB, yearB] = firstDateB.split('.')
					const dateStrA = `${yearA}-${monthA}-${dayA}`
					const dateStrB = `${yearB}-${monthB}-${dayB}`

					// Compare dates as strings (YYYY-MM-DD format sorts correctly lexically)
					return dateStrA.localeCompare(dateStrB)
				},
			},
			{
				accessorKey: 'totalRecords',
				header: () => <div className='text-center'>{t('table.totalRecords')}</div>,
				cell: ({ getValue }) => {
					return <div className='text-left'>{getValue() as number}</div>
				},
			},
			{
				accessorKey: 'recordsQualifiedAgents',
				header: () => <div className='text-center'>{t('table.qualifiedAgents')}</div>,
				cell: ({ getValue }) => {
					return <div className='text-left'>{getValue() as number}</div>
				},
			},
			{
				accessorKey: 'changedRecords',
				header: () => <div className='text-center'>{t('table.recordsChanged')}</div>,
				cell: ({ getValue }) => {
					return <div className='text-left'>{getValue() as number}</div>
				},
			},
			{
				accessorKey: 'goodPercentage',
				header: () => <div className='text-center'>{t('table.goodPercentage')}</div>,
				cell: ({ getValue }) => {
					const value = getValue() as number
					return (
						<div className='flex justify-left'>
							<span
								className={`inline-block px-2 py-1 rounded text-sm font-medium ${getQualityBgClass(
									value
								)}`}
							>
								{value.toFixed(1)}%
							</span>
						</div>
					)
				},
			},
			{
				accessorKey: 'sortOrder',
				header: '',
				enableSorting: true,
				enableHiding: true,
			},
		],
		[t]
	)

	// Initialize table (client-side sorting/filtering only - NO client-side pagination)
	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			globalFilter,
			columnVisibility: {
				sortOrder: false, // Hide sortOrder column
			},
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		// NO getPaginationRowModel() - we use server-side pagination
		globalFilterFn: (row, columnId, filterValue) => {
			// Only filter by category
			const category = String(row.getValue('category')).toLowerCase()
			return category.includes(String(filterValue).toLowerCase())
		},
		manualPagination: true, // Tell TanStack Table we handle pagination ourselves
		pageCount: totalPages,
	})

	// Handle CSV export (current page only)
	const handleExport = () => {
		const filteredData = table
			.getFilteredRowModel()
			.rows.map(row => row.original)
		const today = new Date().toISOString().split('T')[0]
		exportToCSV(filteredData, `ai_stats_page${currentPage + 1}_${today}`)
	}

	// Handle page navigation
	const handlePreviousPage = () => {
		if (hasPreviousPage) {
			setCurrentPage((prev) => prev - 1)
		}
	}

	const handleNextPage = () => {
		if (hasNextPage) {
			setCurrentPage((prev) => prev + 1)
		}
	}

	const handlePageClick = (page: number) => {
		setCurrentPage(page)
	}

	// Show loading skeleton on initial load
	if (isLoading) {
		return <TableSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl text-destructive'>
						{t('errors.loadingTable')}
					</CardTitle>
					<CardDescription>{error.message}</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-col gap-3 sm:gap-4'>
					<div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
						<div className='flex-1 min-w-0'>
							<CardTitle className='text-lg sm:text-xl'>
								{t('table.detailedStatistics')}
							</CardTitle>
							<CardDescription className='text-sm mt-1'>
								{t('table.detailedStatisticsDesc')}
							</CardDescription>
						</div>

						{/* Export Button */}
						<Button
							onClick={handleExport}
							variant='outline'
							size='sm'
							className='w-full sm:w-auto'
						>
							<IconDownload className='mr-2 h-4 w-4' />
							{t('table.export')}
						</Button>
					</div>

					{/* Search Input */}
					<div className='relative w-full sm:max-w-sm'>
						<IconSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							placeholder={t('table.searchByCategory')}
							value={globalFilter}
							onChange={e => setGlobalFilter(e.target.value)}
							className='pl-10 text-sm'
						/>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{/* Table */}
				<div className='rounded-md border overflow-x-auto'>
					<Table className='min-w-[640px]'>
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map(header => {
										if (header.column.id === 'sortOrder') return null

										return (
											<TableHead key={header.id}>
												{header.isPlaceholder ? null : (
													<div
														className={
															header.column.getCanSort()
																? 'cursor-pointer select-none flex items-center gap-2'
																: ''
														}
														onClick={header.column.getToggleSortingHandler()}
													>
														{flexRender(
															header.column.columnDef.header,
															header.getContext()
														)}
														{{
															asc: ' ↑',
															desc: ' ↓',
														}[header.column.getIsSorted() as string] ?? null}
													</div>
												)}
											</TableHead>
										)
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map(row => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}
										className={
											row.original.sortOrder === 1 ? 'bg-muted/50' : ''
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
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className='h-24 text-center'
									>
										{t('table.noResults')}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Server-Side Pagination */}
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4'>
					<div className='text-xs sm:text-sm text-muted-foreground text-center sm:text-left'>
						{t('table.showing')}{' '}
						{currentPage * pageSize + 1}{' '}
						{t('table.to')}{' '}
						{Math.min((currentPage + 1) * pageSize, totalCount)}{' '}
						{t('table.of')} {totalCount}
						{isFetching && !isLoading && (
							<span className='ml-2 inline-flex items-center gap-1'>
								<IconLoader2 className='h-3 w-3 animate-spin' />
								<span className='text-xs'>Loading...</span>
							</span>
						)}
					</div>
					<div className='flex flex-col sm:flex-row items-center gap-2'>
						<div className='flex items-center gap-2'>
							<Button
								variant='outline'
								size='sm'
								onClick={handlePreviousPage}
								disabled={!hasPreviousPage || isFetching}
								className='text-xs sm:text-sm'
							>
								<IconChevronLeft className='h-3 w-3 sm:h-4 sm:w-4' />
								<span className='hidden sm:inline'>{t('table.previous')}</span>
							</Button>
							<div className='flex items-center gap-1'>
								{Array.from({ length: totalPages }, (_, i) => i)
									.filter(page => {
										return (
											page === 0 ||
											page === totalPages - 1 ||
											Math.abs(page - currentPage) <= 1
										)
									})
									.map((page, idx, arr) => {
										const showEllipsis = idx > 0 && page - arr[idx - 1] > 1
										return (
											<div key={page} className='flex items-center'>
												{showEllipsis && (
													<span className='px-1 text-xs'>...</span>
												)}
												<Button
													variant={
														currentPage === page
															? 'default'
															: 'outline'
													}
													size='sm'
													onClick={() => handlePageClick(page)}
													disabled={isFetching}
													className='w-7 h-7 sm:w-9 sm:h-9 text-xs sm:text-sm'
												>
													{page + 1}
												</Button>
											</div>
										)
									})}
							</div>
							<Button
								variant='outline'
								size='sm'
								onClick={handleNextPage}
								disabled={!hasNextPage || isFetching}
								className='text-xs sm:text-sm'
							>
								<span className='hidden sm:inline'>{t('table.next')}</span>
								<IconChevronRight className='h-3 w-3 sm:h-4 sm:w-4' />
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
