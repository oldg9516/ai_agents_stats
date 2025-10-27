'use client'

import { useState, useMemo } from 'react'
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getPaginationRowModel,
	getFilteredRowModel,
	flexRender,
	type ColumnDef,
	type SortingState,
} from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { IconDownload, IconSearch, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { getQualityBgClass } from '@/lib/utils/quality-colors'
import { exportToCSV } from '@/lib/utils/export'
import { getCategoryLabel } from '@/constants/category-labels'
import type { DetailedStatsRow } from '@/lib/supabase/types'

interface DetailedStatsTableProps {
	data: DetailedStatsRow[]
}

/**
 * Detailed Stats Table - Hierarchical table with version and week-level data
 *
 * Features:
 * - Sorting (single and multi-column)
 * - Search by category
 * - Pagination (20 per page)
 * - CSV export
 * - Quality color coding
 */
export function DetailedStatsTable({ data }: DetailedStatsTableProps) {
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'category', desc: false },
		{ id: 'sortOrder', desc: false },
	])
	const [globalFilter, setGlobalFilter] = useState('')
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	})

	// Define columns
	const columns = useMemo<ColumnDef<DetailedStatsRow>[]>(
		() => [
			{
				accessorKey: 'category',
				header: 'Category',
				cell: ({ row }) => {
					const isVersionLevel = row.original.sortOrder === 1
					return (
						<div className={isVersionLevel ? 'font-semibold' : 'pl-4 text-muted-foreground'}>
							{getCategoryLabel(row.original.category)}
						</div>
					)
				},
			},
			{
				accessorKey: 'version',
				header: 'Version',
				cell: ({ row }) => {
					const isVersionLevel = row.original.sortOrder === 1
					return (
						<div className={isVersionLevel ? 'font-semibold' : 'text-muted-foreground'}>
							{row.original.version}
						</div>
					)
				},
			},
			{
				accessorKey: 'dates',
				header: 'Dates',
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					return <div className="text-sm">{value || '-'}</div>
				},
			},
			{
				accessorKey: 'totalRecords',
				header: 'Total Records',
				cell: ({ getValue }) => {
					return <div className="text-right">{getValue() as number}</div>
				},
			},
			{
				accessorKey: 'recordsQualifiedAgents',
				header: 'Qualified Agents',
				cell: ({ getValue }) => {
					return <div className="text-right">{getValue() as number}</div>
				},
			},
			{
				accessorKey: 'changedRecords',
				header: 'Changed',
				cell: ({ getValue }) => {
					return <div className="text-right">{getValue() as number}</div>
				},
			},
			{
				accessorKey: 'goodPercentage',
				header: 'Good %',
				cell: ({ getValue }) => {
					const value = getValue() as number
					return (
						<div className="flex justify-end">
							<span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getQualityBgClass(value)}`}>
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
		[]
	)

	// Initialize table
	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			globalFilter,
			pagination,
			columnVisibility: {
				sortOrder: false, // Hide sortOrder column
			},
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: (row, columnId, filterValue) => {
			// Only filter by category
			const category = String(row.getValue('category')).toLowerCase()
			return category.includes(String(filterValue).toLowerCase())
		},
	})

	// Handle CSV export
	const handleExport = () => {
		const filteredData = table.getFilteredRowModel().rows.map((row) => row.original)
		const today = new Date().toISOString().split('T')[0]
		exportToCSV(filteredData, `ai_stats_${today}`)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col gap-3 sm:gap-4">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
						<div className="flex-1 min-w-0">
							<CardTitle className="text-lg sm:text-xl">Detailed Statistics</CardTitle>
							<CardDescription className="text-sm mt-1">
								Quality metrics by category, version, and week
							</CardDescription>
						</div>

						{/* Export Button */}
						<Button onClick={handleExport} variant="outline" size="sm" className="w-full sm:w-auto">
							<IconDownload className="mr-2 h-4 w-4" />
							Export CSV
						</Button>
					</div>

					{/* Search Input */}
					<div className="relative w-full sm:max-w-sm">
						<IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search by category..."
							value={globalFilter}
							onChange={(e) => setGlobalFilter(e.target.value)}
							className="pl-10 text-sm"
						/>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{/* Table */}
				<div className="rounded-md border overflow-x-auto">
					<Table className="min-w-[640px]">
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
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
														{flexRender(header.column.columnDef.header, header.getContext())}
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
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}
										className={row.original.sortOrder === 1 ? 'bg-muted/50' : ''}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center">
										No results found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
					<div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
						Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
						{Math.min(
							(table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
							table.getFilteredRowModel().rows.length
						)}{' '}
						of {table.getFilteredRowModel().rows.length}
					</div>
					<div className="flex flex-col sm:flex-row items-center gap-2">
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
								className="text-xs sm:text-sm"
							>
								<IconChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
								<span className="hidden sm:inline">Previous</span>
							</Button>
							<div className="flex items-center gap-1">
								{Array.from({ length: table.getPageCount() }, (_, i) => i)
									.filter((page) => {
										const current = table.getState().pagination.pageIndex
										return page === 0 || page === table.getPageCount() - 1 || Math.abs(page - current) <= 1
									})
									.map((page, idx, arr) => {
										const showEllipsis = idx > 0 && page - arr[idx - 1] > 1
										return (
											<div key={page} className="flex items-center">
												{showEllipsis && <span className="px-1 text-xs">...</span>}
												<Button
													variant={table.getState().pagination.pageIndex === page ? 'default' : 'outline'}
													size="sm"
													onClick={() => table.setPageIndex(page)}
													className="w-7 h-7 sm:w-9 sm:h-9 text-xs sm:text-sm"
												>
													{page + 1}
												</Button>
											</div>
										)
									})}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
								className="text-xs sm:text-sm"
							>
								<span className="hidden sm:inline">Next</span>
								<IconChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
