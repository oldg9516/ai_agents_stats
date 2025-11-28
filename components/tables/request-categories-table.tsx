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
import { useRequestCategoryStats } from '@/lib/queries/support-queries'
import type { RequestCategoryStats } from '@/lib/supabase/types'
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
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

interface RequestCategoriesTableProps {
	dateRange: { from: Date; to: Date }
}

/**
 * Format response time from hours to human-readable string
 * - Less than 1 hour: show minutes (e.g., "45m")
 * - 1-24 hours: show hours with 1 decimal (e.g., "4.2h")
 * - More than 24 hours: show days and hours (e.g., "2d 5h")
 */
function formatResponseTime(hours: number): string {
	if (hours < 1) {
		return `${Math.round(hours * 60)}m`
	} else if (hours < 24) {
		return `${hours.toFixed(1)}h`
	} else {
		const days = Math.floor(hours / 24)
		const remainingHours = Math.round(hours % 24)
		return `${days}d ${remainingHours}h`
	}
}

/**
 * Request Categories Table - Shows request types and subtypes breakdown
 *
 * Features:
 * - Client-side pagination (50 rows per page)
 * - Sorting by all columns
 * - Search by request_type or request_subtype
 * - CSV export
 * - Shows count and percentage for each category
 * - Date range filtering
 */
export function RequestCategoriesTable({
	dateRange,
}: RequestCategoriesTableProps) {
	const t = useTranslations()

	// Fetch data with date filter
	const { data, isLoading, error } = useRequestCategoryStats(dateRange)

	// Client-side sorting and filtering
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'count', desc: true },
	])
	const [globalFilter, setGlobalFilter] = useState('')

	// Define columns
	const columns = useMemo<ColumnDef<RequestCategoryStats>[]>(
		() => [
			{
				accessorKey: 'request_type',
				header: t('requestCategories.table.requestType'),
				cell: ({ getValue }) => {
					const value = getValue() as string
					return <div className='font-medium'>{value}</div>
				},
			},
			{
				accessorKey: 'request_subtype',
				header: t('requestCategories.table.requestSubtype'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					return (
						<div
							className={value === null ? 'text-muted-foreground italic' : ''}
						>
							{value === null ? (
								'NULL'
							) : value === 'multiply' ? (
								<span className='px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium'>
									Multiple
								</span>
							) : (
								value
							)}
						</div>
					)
				},
			},
			{
				accessorKey: 'count',
				header: t('requestCategories.table.count'),
				cell: ({ getValue }) => {
					const value = getValue() as number
					return (
						<div className='text-center font-medium'>
							{value.toLocaleString()}
						</div>
					)
				},
			},
			{
				accessorKey: 'percent',
				header: t('requestCategories.table.percent'),
				cell: ({ getValue }) => {
					const value = getValue() as number
					return (
						<div className='text-center'>
							<span className='font-medium'>{value}%</span>
						</div>
					)
				},
			},
			{
				accessorKey: 'compared_count',
				header: t('requestCategories.table.agentResponses'),
				cell: ({ getValue }) => {
					const value = (getValue() as number) ?? 0
					return (
						<div className='text-center font-medium'>
							{value.toLocaleString()}
						</div>
					)
				},
			},
			{
				accessorKey: 'avg_response_time',
				header: t('requestCategories.table.avgResponseTime'),
				cell: ({ getValue }) => {
					const value = (getValue() as number) ?? 0
					return (
						<div className='text-center'>
							{value > 0 ? formatResponseTime(value) : '—'}
						</div>
					)
				},
			},
			{
				accessorKey: 'p90_response_time',
				header: t('requestCategories.table.p90ResponseTime'),
				cell: ({ getValue }) => {
					const value = (getValue() as number) ?? 0
					return (
						<div className='text-center'>
							{value > 0 ? formatResponseTime(value) : '—'}
						</div>
					)
				},
			},
		],
		[t]
	)

	// Calculate totals from ALL data (not just current page)
	const totals = useMemo(() => {
		const totalCount = data.reduce((sum, row) => sum + row.count, 0)
		const totalComparedCount = data.reduce(
			(sum, row) => sum + (row.compared_count ?? 0),
			0
		)
		const totalPercent = data.reduce((sum, row) => sum + row.percent, 0)

		// Calculate weighted average response times (weighted by compared_count)
		const rowsWithResponseTime = data.filter(
			row => (row.compared_count ?? 0) > 0 && (row.avg_response_time ?? 0) > 0
		)
		const totalWeightedAvg = rowsWithResponseTime.reduce(
			(sum, row) => sum + (row.avg_response_time ?? 0) * (row.compared_count ?? 0),
			0
		)
		const totalWeightedP90 = rowsWithResponseTime.reduce(
			(sum, row) => sum + (row.p90_response_time ?? 0) * (row.compared_count ?? 0),
			0
		)
		const totalResponseCount = rowsWithResponseTime.reduce(
			(sum, row) => sum + (row.compared_count ?? 0),
			0
		)

		const avgResponseTime =
			totalResponseCount > 0 ? totalWeightedAvg / totalResponseCount : 0
		const p90ResponseTime =
			totalResponseCount > 0 ? totalWeightedP90 / totalResponseCount : 0

		return {
			totalCount,
			totalComparedCount,
			totalPercent,
			avgResponseTime,
			p90ResponseTime,
		}
	}, [data])

	// Create table instance
	const table = useReactTable({
		data,
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
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: (row, columnId, filterValue) => {
			const requestType = String(row.original.request_type || '').toLowerCase()
			const requestSubtype = String(
				row.original.request_subtype || ''
			).toLowerCase()
			const filter = String(filterValue).toLowerCase()
			return requestType.includes(filter) || requestSubtype.includes(filter)
		},
		initialState: {
			pagination: {
				pageSize: 50,
			},
		},
	})

	// Handle CSV export
	const handleExport = () => {
		const headers = [
			'Request Type',
			'Request Subtype',
			'Count',
			'Percent',
			'Agent Responses',
			'Avg Response Time (h)',
			'P90 Response Time (h)',
		]
		const rows = data.map(row => [
			row.request_type,
			row.request_subtype || 'NULL',
			row.count,
			`${row.percent}%`,
			row.compared_count ?? 0,
			row.avg_response_time ?? 0,
			row.p90_response_time ?? 0,
		])

		// Add total row
		const totalRow = [
			'Total',
			'',
			totals.totalCount,
			`${totals.totalPercent.toFixed(1)}%`,
			totals.totalComparedCount,
			totals.avgResponseTime > 0 ? totals.avgResponseTime.toFixed(1) : '',
			totals.p90ResponseTime > 0 ? totals.p90ResponseTime.toFixed(1) : '',
		]

		const csv = [
			headers.join(','),
			...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
			totalRow.map(cell => `"${cell}"`).join(','),
		].join('\n')

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
		const link = document.createElement('a')
		const url = URL.createObjectURL(blob)
		link.setAttribute('href', url)
		link.setAttribute(
			'download',
			`request-categories-${format(new Date(), 'yyyy-MM-dd')}.csv`
		)
		link.style.visibility = 'hidden'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}

	// Loading state
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>
						{t('requestCategories.table.title')}
					</CardTitle>
					<CardDescription className='text-sm'>
						{t('requestCategories.table.description')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center justify-center py-8'>
						<IconLoader2 className='h-8 w-8 animate-spin text-muted-foreground' />
					</div>
				</CardContent>
			</Card>
		)
	}

	// Error state
	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>
						{t('requestCategories.table.title')}
					</CardTitle>
					<CardDescription className='text-sm'>
						{t('requestCategories.table.description')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex flex-col items-center justify-center py-8 text-center'>
						<p className='text-sm text-muted-foreground'>{error.message}</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
					<div>
						<CardTitle className='text-lg sm:text-xl'>
							{t('requestCategories.table.title')}
						</CardTitle>
						<CardDescription className='text-sm'>
							{t('requestCategories.table.description')}
						</CardDescription>
					</div>
					<Button onClick={handleExport} size='sm' variant='outline'>
						<IconDownload className='mr-2 h-4 w-4' />
						{t('table.export')}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{/* Search */}
				<div className='mb-4'>
					<div className='relative'>
						<IconSearch className='absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							placeholder={t('requestCategories.table.search')}
							value={globalFilter}
							onChange={e => setGlobalFilter(e.target.value)}
							className='pl-8'
						/>
					</div>
				</div>

				{/* Table */}
				<div className='rounded-md border overflow-x-auto'>
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map(header => (
										<TableHead
											key={header.id}
											className={`whitespace-nowrap ${'text-center'}`}
										>
											{header.isPlaceholder ? null : (
												<Button
													variant='ghost'
													size='sm'
													className='-ml-3 h-8 data-[state=open]:bg-accent'
													onClick={header.column.getToggleSortingHandler()}
												>
													{flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
													{header.column.getIsSorted() === 'asc' && ' ↑'}
													{header.column.getIsSorted() === 'desc' && ' ↓'}
												</Button>
											)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								<>
									{table.getRowModel().rows.map(row => (
										<TableRow
											key={row.id}
											data-state={row.getIsSelected() && 'selected'}
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
									))}
									{/* Total Row */}
									<TableRow className='bg-muted/50 font-semibold border-t-2'>
										<TableCell className='font-bold'>Total</TableCell>
										<TableCell></TableCell>
										<TableCell className='text-center font-bold'>
											{totals.totalCount.toLocaleString()}
										</TableCell>
										<TableCell className='text-center font-bold'>
											{totals.totalPercent.toFixed(1)}%
										</TableCell>
										<TableCell className='text-center font-bold'>
											{totals.totalComparedCount.toLocaleString()}
										</TableCell>
										<TableCell className='text-center font-bold'>
											{totals.avgResponseTime > 0
												? formatResponseTime(totals.avgResponseTime)
												: '—'}
										</TableCell>
										<TableCell className='text-center font-bold'>
											{totals.p90ResponseTime > 0
												? formatResponseTime(totals.p90ResponseTime)
												: '—'}
										</TableCell>
									</TableRow>
								</>
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

				{/* Client-side Pagination */}
				<div className='flex items-center justify-between pt-4'>
					<div className='text-sm text-muted-foreground'>
						{t('table.showing')}{' '}
						{table.getState().pagination.pageIndex *
							table.getState().pagination.pageSize +
							1}{' '}
						{t('table.to')}{' '}
						{Math.min(
							(table.getState().pagination.pageIndex + 1) *
								table.getState().pagination.pageSize,
							table.getFilteredRowModel().rows.length
						)}{' '}
						{t('table.of')} {table.getFilteredRowModel().rows.length}{' '}
						{t('table.results')}
					</div>
					<div className='flex items-center space-x-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<IconChevronLeft className='h-4 w-4' />
							{t('table.previous')}
						</Button>
						<div className='text-sm text-muted-foreground'>
							{t('table.page')} {table.getState().pagination.pageIndex + 1}{' '}
							{t('table.of')} {table.getPageCount()}
						</div>
						<Button
							variant='outline'
							size='sm'
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							{t('table.next')}
							<IconChevronRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
