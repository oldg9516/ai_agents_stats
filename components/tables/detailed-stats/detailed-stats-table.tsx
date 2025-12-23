'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { IconDownload, IconSearch } from '@tabler/icons-react'
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from '@tanstack/react-table'

import { CategoryDisplayToggle } from '@/components/category-display-toggle'
import { TableSkeleton } from '@/components/loading/table-skeleton'
import { ScoringModeToggle } from '@/components/scoring-mode-toggle'

// Dynamic import for modal - reduces initial bundle size
const ScoreGroupModal = dynamic(
	() => import('@/components/score-group-modal').then(mod => ({ default: mod.ScoreGroupModal })),
	{ ssr: false }
)
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
import { useDetailedStatsPaginated } from '@/lib/queries/dashboard-queries'
import { useDashboardFilters } from '@/lib/store/hooks/use-dashboard-filters'
import type { DetailedStatsRow } from '@/lib/supabase/types'
import { exportToCSV } from '@/lib/utils/export'

import { createBaseColumns, sortOrderColumn } from './base-columns'
import { createLegacyColumns } from './legacy-columns'
import { createNewColumns, type ScoreGroupClickHandler } from './new-columns'
import { TablePagination, type PageSize } from './table-pagination'
import { buildLatestWeeksMap, checkIsLatestWeek, type DetailedStatsTableProps } from './types'

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
	const { scoringMode, categoryDisplayMode, openScoreGroupModal } = useDashboardFilters()

	// Server-side pagination state
	const [currentPage, setCurrentPage] = useState(0)
	const [pageSize, setPageSize] = useState<PageSize>(20)

	// Fetch paginated data with category display mode
	const {
		data,
		totalCount,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		isLoading,
		error,
		isFetching,
	} = useDetailedStatsPaginated(filters, currentPage, pageSize, categoryDisplayMode)

	// Client-side sorting and filtering (on current page only)
	const [sorting, setSorting] = useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = useState('')

	// Handle category click
	const handleCategoryClick = useCallback((category: string) => {
		router.push(`/dashboard/category/${encodeURIComponent(category)}`)
	}, [router])

	// Handle score group cell click - opens modal with filtered tickets
	const handleScoreGroupClick: ScoreGroupClickHandler = useCallback((params) => {
		openScoreGroupModal(params)
	}, [openScoreGroupModal])

	// Build columns based on scoring mode
	const baseColumns = useMemo(
		() => createBaseColumns(t, handleCategoryClick),
		[t, handleCategoryClick]
	)
	const legacyColumns = useMemo(() => createLegacyColumns(t), [t])
	const newColumns = useMemo(
		() => createNewColumns(t, handleScoreGroupClick),
		[t, handleScoreGroupClick]
	)

	// Define columns based on scoring mode
	const columns = useMemo<ColumnDef<DetailedStatsRow>[]>(
		() => [
			...baseColumns,
			...(scoringMode === 'legacy' ? legacyColumns : newColumns),
			sortOrderColumn,
		],
		[baseColumns, legacyColumns, newColumns, scoringMode]
	)

	// Find the latest week for each category (to highlight)
	const latestWeeksByCategory = useMemo(
		() => buildLatestWeeksMap(data),
		[data]
	)

	// Helper to check if a row is the latest week for its category
	const isLatestWeek = (row: DetailedStatsRow): boolean => {
		return checkIsLatestWeek(row, latestWeeksByCategory)
	}

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
	const handleExport = useCallback(() => {
		const filteredData = table
			.getFilteredRowModel()
			.rows.map(row => row.original)
		const today = new Date().toISOString().split('T')[0]
		exportToCSV(filteredData, `ai_stats_page${currentPage + 1}_${today}`)
	}, [table, currentPage])

	// Handle page navigation
	const handlePreviousPage = useCallback(() => {
		if (hasPreviousPage) {
			setCurrentPage(prev => prev - 1)
		}
	}, [hasPreviousPage])

	const handleNextPage = useCallback(() => {
		if (hasNextPage) {
			setCurrentPage(prev => prev + 1)
		}
	}, [hasNextPage])

	const handlePageClick = useCallback((page: number) => {
		setCurrentPage(page)
	}, [])

	const handlePageSizeChange = useCallback((size: number) => {
		setPageSize(size as PageSize)
		setCurrentPage(0) // Reset to first page when changing page size
	}, [])

	// Show loading skeleton on initial load
	if (isLoading) {
		return <TableSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-lg sm:text-xl text-destructive">
						{t('errors.loadingTable')}
					</CardTitle>
					<CardDescription>{error.message}</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<>
			{/* Score Group Modal */}
			<ScoreGroupModal />

			<Card>
				<CardHeader>
				<div className="flex flex-col gap-3 sm:gap-4">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
						<div className="flex-1 min-w-0">
							<CardTitle className="text-lg sm:text-xl">
								{t('table.detailedStatistics')}
							</CardTitle>
							<CardDescription className="text-sm mt-1">
								{t('table.detailedStatisticsDesc')}
							</CardDescription>
						</div>

						{/* Export Button */}
						<Button
							onClick={handleExport}
							variant="outline"
							size="sm"
							className="w-full sm:w-auto"
						>
							<IconDownload className="mr-2 h-4 w-4" />
							{t('table.export')}
						</Button>
					</div>

					{/* Search Input & Toggles */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="relative w-full sm:max-w-sm">
							<IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder={t('table.searchByCategory')}
								value={globalFilter}
								onChange={e => setGlobalFilter(e.target.value)}
								className="pl-10 text-sm"
							/>
						</div>
						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
							<CategoryDisplayToggle />
							<ScoringModeToggle />
						</div>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{/* Table */}
				<div className="rounded-md border overflow-x-auto">
					<Table className="min-w-[640px]">
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map(header => {
										if (header.column.id === 'sortOrder') return null

										return (
											<TableHead
												key={header.id}
												colSpan={header.colSpan}
												className={header.colSpan > 1 ? 'text-center' : ''}
											>
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
								table.getRowModel().rows.map(row => {
									const isVersion = row.original.sortOrder === 1
									const _isLatest = isLatestWeek(row.original)

									return (
										<TableRow
											key={row.id}
											data-state={row.getIsSelected() && 'selected'}
											className={
												isVersion
													? 'bg-blue-50/50 dark:bg-blue-950/20 border-t-4 border-t-muted-foreground/20'
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
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										{t('table.noResults')}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<TablePagination
					t={t}
					currentPage={currentPage}
					pageSize={pageSize}
					totalCount={totalCount}
					totalPages={totalPages}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					isFetching={isFetching}
					isLoading={isLoading}
					globalFilter={globalFilter}
					filteredRowsCount={table.getFilteredRowModel().rows.length}
					onPreviousPage={handlePreviousPage}
					onNextPage={handleNextPage}
					onPageClick={handlePageClick}
					onPageSizeChange={handlePageSizeChange}
				/>
			</CardContent>
		</Card>
		</>
	)
}
