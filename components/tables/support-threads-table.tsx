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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
	IconCheck,
	IconX,
} from '@tabler/icons-react'
import type { SupportThread } from '@/lib/supabase/types'
import { downloadSupportThreadsCSV } from '@/lib/utils/export-support'
import { getStatusLabel } from '@/constants/support-statuses'
import { getRequestTypeLabel } from '@/constants/request-types'
import { getActiveRequirementsWithColors } from '@/constants/requirement-types'
import { isQualifiedAgent } from '@/constants/qualified-agents'
import { format } from 'date-fns'

interface SupportThreadsTableProps {
	data: SupportThread[]
	hasMore?: boolean // Whether there are more records on server
	isFetchingMore?: boolean // Loading more records
	onLoadMore?: () => void // Callback to load next batch
}

/**
 * Support Threads Table - Displays all support threads with quality data
 *
 * Features:
 * - Sorting (single and multi-column)
 * - Search by thread ID or ticket ID
 * - Pagination (20 per page, client-side)
 * - Incremental loading (60 records per batch from server)
 * - CSV export
 * - Click row to view detail
 * - Quality indicators
 */
export function SupportThreadsTable({
	data,
	hasMore = false,
	isFetchingMore = false,
	onLoadMore,
}: SupportThreadsTableProps) {
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
	// Only recreate when data array reference changes
	const memoizedData = useMemo(() => data, [data])

	// Track previous data length to detect when filters changed
	const prevDataLengthRef = useRef(memoizedData.length)
	// Track if we're waiting for new batch to load (user clicked Next on last page)
	const waitingForNextBatchRef = useRef(false)

	// Reset to first page when data significantly changes (filters changed)
	// OR move to next page when new batch arrives
	useEffect(() => {
		const prevLength = prevDataLengthRef.current
		const currentLength = memoizedData.length

		// If data decreased, filters likely changed - reset to first page
		if (currentLength < prevLength) {
			console.log('🔄 [Table] Data decreased (filters changed), resetting to page 1:', {
				prevLength,
				currentLength,
			})
			setPagination((prev) => ({ ...prev, pageIndex: 0 }))
			waitingForNextBatchRef.current = false
		} else if (currentLength > prevLength) {
			console.log('📦 [Table] Data increased (new batch loaded):', {
				prevLength,
				currentLength,
				currentPage: pagination.pageIndex,
				waitingForNextBatch: waitingForNextBatchRef.current,
			})

			// If we were waiting for next batch, move to next page
			if (waitingForNextBatchRef.current) {
				const nextPageIndex = pagination.pageIndex + 1
				console.log('➡️ [Table] Moving to next page after batch load:', nextPageIndex)
				setPagination((prev) => ({ ...prev, pageIndex: nextPageIndex }))
				waitingForNextBatchRef.current = false
			}
		}

		prevDataLengthRef.current = currentLength
	}, [memoizedData.length, pagination.pageIndex])

	// Define columns
	const columns = useMemo<ColumnDef<SupportThread>[]>(
		() => [
			{
				accessorKey: 'thread_id',
				header: t('table.threadId'),
				cell: ({ getValue }) => {
					const value = getValue() as string
					return <div className='font-mono text-xs truncate max-w-[120px]'>{value}</div>
				},
			},
			{
				accessorKey: 'ticket_id',
				header: t('table.ticketId'),
				cell: ({ getValue }) => {
					const value = getValue() as string
					return <div className='font-mono text-xs'>{value}</div>
				},
			},
			{
				accessorKey: 'request_type',
				header: t('table.type'),
				cell: ({ getValue }) => {
					return <div className='text-sm'>{getRequestTypeLabel(getValue() as string)}</div>
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
				accessorKey: 'status',
				header: t('table.status'),
				cell: ({ getValue }) => {
					return <div className='text-sm'>{getStatusLabel(getValue() as string)}</div>
				},
			},
			{
				id: 'requirements',
				header: t('table.requirements'),
				cell: ({ row }) => {
					const requirements = getActiveRequirementsWithColors(
						row.original as unknown as Record<string, boolean>
					)
					const hasHumanReply = row.original.human_reply !== null && row.original.human_reply !== ''

					return (
						<div className='flex flex-wrap gap-1'>
							{hasHumanReply && (
								<span className='px-1.5 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'>
									{t('table.humanReply')}
								</span>
							)}
							{requirements.length > 0 ? (
								requirements.map((req) => (
									<span
										key={req.key}
										className={`px-1.5 py-0.5 rounded text-xs ${req.bgColor} ${req.textColor}`}
									>
										{req.label}
									</span>
								))
							) : !hasHumanReply ? (
								<span className='text-xs text-muted-foreground'>None</span>
							) : null}
						</div>
					)
				},
			},
			{
				accessorKey: 'ai_draft_reply',
				header: t('table.aiDraft'),
				cell: ({ getValue }) => {
					const hasDraft = getValue() !== null
					return (
						<div className='flex items-center justify-center'>
							{hasDraft ? (
								<IconCheck className='h-4 w-4 text-green-600 dark:text-green-400' />
							) : (
								<IconX className='h-4 w-4 text-red-600 dark:text-red-400' />
							)}
						</div>
					)
				},
			},
			{
				accessorKey: 'qualityPercentage',
				header: t('table.quality'),
				cell: ({ row }) => {
					const value = row.original.qualityPercentage
					const humanReply = row.original.human_reply
					const email = row.original.email

					// Only show quality percentage if:
					// 1. Human reply exists
					// 2. Email belongs to a qualified agent
					if (!humanReply || value === null || !email || !isQualifiedAgent(email)) {
						return <div className='text-center text-muted-foreground'>—</div>
					}
					const bgClass =
						value > 60
							? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
							: value > 30
								? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
								: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'

					return (
						<div className={`text-center font-medium px-2 py-1 rounded ${bgClass}`}>
							{value.toFixed(0)}%
						</div>
					)
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
			{
				accessorKey: 'created_at',
				header: t('table.createdAt'),
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
		// IMPORTANT: Don't reset page index when data changes (new batch loaded)
		autoResetPageIndex: false,
		globalFilterFn: (row, columnId, filterValue) => {
			const threadId = String(row.original.thread_id || '').toLowerCase()
			const ticketId = String(row.original.ticket_id || '').toLowerCase()
			const filter = String(filterValue).toLowerCase()
			return threadId.includes(filter) || ticketId.includes(filter)
		},
	})

	// Handle CSV export
	const handleExport = () => {
		const filename = `support-threads-${format(new Date(), 'yyyy-MM-dd')}.csv`
		downloadSupportThreadsCSV(memoizedData, filename)
	}

	// Handle row click - navigates to thread detail (intercepted by parallel route modal)
	const handleRowClick = (thread: SupportThread) => {
		router.push(`/support-overview/thread/${thread.thread_id}`)
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
					<div>
						<CardTitle className='text-lg sm:text-xl'>{t('table.supportThreads')}</CardTitle>
						<CardDescription className='text-sm'>
							{t('table.supportThreadsDesc')}
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
							placeholder={t('table.searchByThreadOrTicket')}
							value={globalFilter}
							onChange={(e) => setGlobalFilter(e.target.value)}
							className='pl-8'
						/>
					</div>
				</div>

				{/* Table */}
				<div className='rounded-md border overflow-x-auto'>
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
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
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}
										className='cursor-pointer hover:bg-muted/50'
										onClick={() => handleRowClick(row.original)}
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
									<TableCell colSpan={columns.length} className='h-24 text-center'>
										{t('table.noResults')}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<div className='flex items-center justify-between pt-4'>
					<div className='text-sm text-muted-foreground'>
						{t('table.showing')} {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} {t('table.to')}{' '}
						{Math.min(
							(table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
							table.getFilteredRowModel().rows.length
						)}{' '}
						{t('table.of')} {table.getFilteredRowModel().rows.length} {t('table.results')}
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
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								// Check if we can go to next page
								const canGoNext = table.getCanNextPage()
								const currentPage = table.getState().pagination.pageIndex

								console.log('➡️ [Table] Next button clicked:', {
									currentPage,
									canGoNext,
									hasMore,
									isFetchingMore,
									totalRows: table.getFilteredRowModel().rows.length,
								})

								// If we can go to next page, do it
								if (canGoNext) {
									console.log('✅ [Table] Moving to next page')
									table.nextPage()
								}
								// If we're on last page and there's more data on server, load next batch
								else if (hasMore && onLoadMore && !isFetchingMore) {
									console.log('📥 [Table] Loading next batch from server')
									// Set flag so we know to move to next page when data arrives
									waitingForNextBatchRef.current = true
									onLoadMore()
								}
							}}
							disabled={!table.getCanNextPage() && !hasMore}
						>
							{isFetchingMore ? (
								<>
									<Spinner className='mr-2' />
									{t('table.loading')}
								</>
							) : (
								t('table.next')
							)}
							<IconChevronRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
