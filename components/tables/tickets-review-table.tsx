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
import type { TicketReviewRecord } from '@/lib/supabase/types'
import { format } from 'date-fns'

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
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	})

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

	// Get classification label and color
	const getClassificationLabel = (classification: string | null) => {
		if (!classification) return '—'
		// Только для валидных классификаций
		const validClassifications = ['critical_error', 'meaningful_improvement', 'stylistic_preference', 'no_significant_change', 'context_shift']
		if (!validClassifications.includes(classification)) {
			return classification // Показать как есть, если неизвестный статус
		}
		return t(`ticketsReview.classifications.${classification}` as any)
	}

	const getClassificationColor = (classification: string | null) => {
		switch (classification) {
			case 'critical_error':
				return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
			case 'meaningful_improvement':
				return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
			case 'stylistic_preference':
				return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
			case 'no_significant_change':
				return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
			case 'context_shift':
				return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
			default:
				return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
		}
	}

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
				<div className='flex items-center justify-between pt-4'>
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
