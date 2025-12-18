'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	IconDownload,
	IconSearch,
	IconChevronLeft,
	IconChevronRight,
} from '@tabler/icons-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { PAGE_SIZE_OPTIONS, type PageSize } from './detailed-stats/table-pagination'
import type { TicketReviewRecord } from '@/lib/supabase/types'
import { format } from 'date-fns'
import {
	getClassificationColor as getClassificationColorFromConstants,
	CLASSIFICATION_TYPES,
} from '@/constants/classification-types'

interface TicketsReviewTableProps {
	data: TicketReviewRecord[]
	hasMore?: boolean // Whether there are more records on server
	isFetchingMore?: boolean // Loading more records
	onLoadMore?: () => void // Callback to load next batch
}

/**
 * Tickets Review Table - Displays tickets changed by agents
 *
 * Features:
 * - Sorting (single and multi-column)
 * - Search by ticket ID, agent, customer email
 * - Pagination (20 per page, client-side)
 * - Incremental loading (60 records per batch from server)
 * - CSV export
 * - Click row to view detail
 * - Classification color coding
 * - Status indicators
 */
export function TicketsReviewTable({
	data,
	hasMore = false,
	isFetchingMore = false,
	onLoadMore,
}: TicketsReviewTableProps) {
	const t = useTranslations()
	const router = useRouter()
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'created_at', desc: true },
	])
	const [globalFilter, setGlobalFilter] = useState('')
	const [pageSize, setPageSize] = useState<PageSize>(20)
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	})

	// Handle page size change
	const handlePageSizeChange = (size: number) => {
		setPageSize(size as PageSize)
		setPagination({ pageIndex: 0, pageSize: size })
	}

	// Memoize data to prevent unnecessary re-renders of React Table
	const memoizedData = useMemo(() => data, [data])

	// Track previous data length to detect when filters changed
	const prevDataLengthRef = useRef(memoizedData.length)
	// Track current page when loading more (to calculate new page after batch loads)
	const pageBeforeLoadRef = useRef<number | null>(null)

	// Reset to first page when data significantly changes (filters changed)
	// OR move to correct page when new batch arrives
	useEffect(() => {
		const prevLength = prevDataLengthRef.current
		const currentLength = memoizedData.length

		// If data decreased, filters likely changed - reset to first page
		if (currentLength < prevLength) {
			setPagination(prev => ({ ...prev, pageIndex: 0 }))
			pageBeforeLoadRef.current = null
		} else if (currentLength > prevLength && pageBeforeLoadRef.current !== null) {
			// Data increased - new batch loaded
			// Calculate the page that shows the first record from new batch
			const pageSize = pagination.pageSize
			const newPageIndex = Math.floor(prevLength / pageSize)

			setPagination(prev => ({
				...prev,
				pageIndex: newPageIndex,
			}))
			pageBeforeLoadRef.current = null
		}

		prevDataLengthRef.current = currentLength
	}, [memoizedData.length, pagination.pageSize])

	// Get classification label
	const getClassificationLabel = (classification: string | null) => {
		if (!classification) return '—'
		// Check if it's a valid classification (legacy or new)
		if (!CLASSIFICATION_TYPES.includes(classification as any)) {
			return classification // Show as-is if unknown status
		}
		return t(`ticketsReview.classifications.${classification}` as any)
	}

	// Use centralized color function
	const getClassificationColor = getClassificationColorFromConstants

	// Define columns
	const columns = useMemo<ColumnDef<TicketReviewRecord>[]>(
		() => [
			{
				accessorKey: 'created_at',
				header: t('ticketsReview.table.date'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					if (!value) return <div className='text-sm'>—</div>
					return (
						<div className='text-sm'>
							{format(new Date(value), 'MMM dd, yyyy')}
						</div>
					)
				},
			},
			{
				accessorKey: 'email',
				header: t('ticketsReview.table.agent'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					return <div className='text-sm truncate max-w-[200px]'>{value || '—'}</div>
				},
			},
			{
				accessorKey: 'user',
				header: t('ticketsReview.table.customerEmail'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					return <div className='text-sm truncate max-w-[200px]'>{value || '—'}</div>
				},
			},
			{
				accessorKey: 'change_classification',
				header: t('ticketsReview.table.classification'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					const label = getClassificationLabel(value)
					const colorClass = getClassificationColor(value)
					return (
						<div className={`text-center text-sm px-2 py-1 rounded ${colorClass}`}>
							{label}
						</div>
					)
				},
			},
			{
				accessorKey: 'review_status',
				header: t('ticketsReview.table.status'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					const isProcessed = value === 'processed'
					return (
						<div
							className={`text-center text-sm px-2 py-1 rounded ${
								isProcessed
									? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
									: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
							}`}
						>
							{isProcessed
								? t('ticketsReview.statuses.processed')
								: t('ticketsReview.statuses.unprocessed')}
						</div>
					)
				},
			},
			{
				accessorKey: 'request_subtype',
				header: t('table.category'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					return <div className='text-sm'>{value || '—'}</div>
				},
			},
			{
				accessorKey: 'prompt_version',
				header: t('table.version'),
				cell: ({ getValue }) => {
					const value = getValue() as string | null
					return <div className='text-sm'>{value || '—'}</div>
				},
			},
		],
		[t]
	)

	// Create table instance
	const table = useReactTable({
		data: memoizedData,
		columns,
		state: {
			sorting,
			globalFilter,
			pagination,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: (row, columnId, filterValue) => {
			const ticketId = String(row.original.ticket_id || '').toLowerCase()
			const email = String(row.original.email || '').toLowerCase()
			const user = String(row.original.user || '').toLowerCase()
			const filter = String(filterValue).toLowerCase()
			return (
				ticketId.includes(filter) ||
				email.includes(filter) ||
				user.includes(filter)
			)
		},
	})

	// Handle CSV export
	const handleExport = () => {
		// TODO: Implement CSV export
		console.log('Export CSV')
	}

	// Handle row click - navigates to ticket detail
	const handleRowClick = (ticket: TicketReviewRecord) => {
		router.push(`/tickets-review/ticket/${ticket.id}`)
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
					<div>
						<CardTitle className='text-lg sm:text-xl'>
							{t('ticketsReview.title')}
						</CardTitle>
						<CardDescription className='text-sm'>
							{t('ticketsReview.description')}
						</CardDescription>
					</div>
					<Button onClick={handleExport} size='sm' variant='outline'>
						<IconDownload className='mr-2 h-4 w-4' />
						{t('ticketsReview.table.export')}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{/* Search */}
				<div className='mb-4'>
					<div className='relative'>
						<IconSearch className='absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							placeholder={t('ticketsReview.table.search')}
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
										<TableHead key={header.id} className='whitespace-nowrap'>
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
								table.getRowModel().rows.map(row => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}
										className='cursor-pointer hover:bg-muted/50'
										onClick={() => handleRowClick(row.original)}
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
									<TableCell colSpan={columns.length} className='h-24 text-center'>
										{t('ticketsReview.table.noResults')}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4'>
					<div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4'>
						{/* Page size selector */}
						<div className='flex items-center gap-2'>
							<span className='text-xs sm:text-sm text-muted-foreground'>
								{t('table.rowsPerPage')}:
							</span>
							<Select
								value={String(pageSize)}
								onValueChange={value => handlePageSizeChange(Number(value))}
							>
								<SelectTrigger className='w-[80px] h-8 text-xs sm:text-sm'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAGE_SIZE_OPTIONS.map(size => (
										<SelectItem key={size} value={String(size)}>
											{size}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Results count */}
						<div className='text-sm text-muted-foreground'>
							{t('ticketsReview.table.showing')}{' '}
							{table.getState().pagination.pageIndex *
								table.getState().pagination.pageSize +
								1}{' '}
							{t('ticketsReview.table.to')}{' '}
							{Math.min(
								(table.getState().pagination.pageIndex + 1) *
									table.getState().pagination.pageSize,
								table.getFilteredRowModel().rows.length
							)}{' '}
							{t('ticketsReview.table.of')}{' '}
							{table.getFilteredRowModel().rows.length}{' '}
							{t('ticketsReview.table.results')}
						</div>
					</div>
					<div className='flex items-center space-x-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<IconChevronLeft className='h-4 w-4' />
							{t('ticketsReview.table.previous')}
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								const isLastPage = !table.getCanNextPage()
								// If on last page and more data exists on server
								if (isLastPage && hasMore && onLoadMore) {
									// Mark current page index before loading
									pageBeforeLoadRef.current = pagination.pageIndex
									// Load more from server
									onLoadMore()
								} else {
									// Normal pagination - move to next page
									table.nextPage()
								}
							}}
							disabled={
								(!table.getCanNextPage() && !hasMore) || isFetchingMore
							}
						>
							{isFetchingMore ? (
								<>
									<Spinner className='h-4 w-4 mr-2' />
									{t('ticketsReview.table.loading')}
								</>
							) : (
								<>
									{t('ticketsReview.table.next')}
									<IconChevronRight className='h-4 w-4' />
								</>
							)}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
