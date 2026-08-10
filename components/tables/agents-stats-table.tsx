'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
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
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { IconSearch, IconInfoCircle } from '@tabler/icons-react'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import type { AgentStatsRow, AgentChangeType } from '@/lib/db/types'
import { FRT_TARGET_HOURS, fulfillmentPercent } from '@/constants/sla-targets'
import { cn } from '@/lib/utils'

/**
 * Format response time from hours to human-readable string
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
 * Render a duration, or a dash when there is nothing to measure
 */
function renderFrt(hours: number, frtCount: number): string {
	return frtCount > 0 && hours > 0 ? formatResponseTime(hours) : '—'
}

/**
 * Color the KPI share: on target, partway there, or far off
 */
function getFulfillmentColor(percent: number): string {
	if (percent >= 100) {
		return 'text-green-600 dark:text-green-400 font-semibold'
	}
	if (percent >= 50) {
		return 'text-yellow-600 dark:text-yellow-400 font-semibold'
	}
	return 'text-red-600 dark:text-red-400 font-semibold'
}

interface AgentsStatsTableProps {
	data: AgentStatsRow[]
	totals: AgentStatsRow | null
	onAgentClick: (email: string, changeType: AgentChangeType) => void
}

/**
 * Agent SLA Stats Table
 *
 * Features:
 * - Sorting (slowest first response first by default)
 * - Search by email
 * - Click row to open modal with agent's changes
 * - Total row at bottom, aggregated server-side over raw tickets
 */
export function AgentsStatsTable({
	data,
	totals,
	onAgentClick,
}: AgentsStatsTableProps) {
	const t = useTranslations('agentsStats')
	// Slowest first response on top — that is what the SLA table is read for
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'avgFrt', desc: true },
	])
	const [globalFilter, setGlobalFilter] = useState('')

	// Column definitions
	const columns = useMemo<ColumnDef<AgentStatsRow>[]>(
		() => [
			{
				accessorKey: 'email',
				header: () => (
					<div className="flex items-center gap-1">
						{t('table.email')}
					</div>
				),
				cell: ({ row }) => (
					<div className="font-medium truncate max-w-[200px]">
						{row.original.email}
					</div>
				),
			},
			{
				accessorKey: 'answeredTickets',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.answeredTickets')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t('tooltips.answeredTickets')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center">{row.original.answeredTickets}</div>
				),
			},
			{
				accessorKey: 'frtCount',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.answeredRequests')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p>{t('tooltips.answeredRequests')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center">{row.original.frtCount}</div>
				),
			},
			{
				accessorKey: 'avgFrt',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.avgFrt')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p>{t('tooltips.avgFrt')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center">
						{renderFrt(row.original.avgFrt, row.original.frtCount)}
					</div>
				),
			},
			{
				accessorKey: 'medianFrt',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.medianFrt')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p>{t('tooltips.medianFrt')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center">
						{renderFrt(row.original.medianFrt, row.original.frtCount)}
					</div>
				),
			},
			{
				accessorKey: 'p90Frt',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.p90ResponseTime')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p>{t('tooltips.p90ResponseTime')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center">
						{renderFrt(row.original.p90Frt, row.original.frtCount)}
					</div>
				),
			},
			{
				id: 'frtFulfillment',
				accessorFn: row =>
					fulfillmentPercent(FRT_TARGET_HOURS, row.medianFrt, row.frtCount) ?? -1,
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.frtFulfillment')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p>{t('tooltips.frtFulfillment')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => {
					const percent = fulfillmentPercent(
						FRT_TARGET_HOURS,
						row.original.medianFrt,
						row.original.frtCount
					)
					return (
						<div
							className={cn(
								'text-center',
								percent !== null && getFulfillmentColor(percent)
							)}
						>
							{percent !== null ? `${percent.toFixed(0)}%` : '—'}
						</div>
					)
				},
			},
			{
				accessorKey: 'medianResolution',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.medianResolution')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p>{t('tooltips.medianResolution')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center">
						{renderFrt(
							row.original.medianResolution,
							row.original.resolutionCount
						)}
					</div>
				),
			},
		],
		[t]
	)

	// Initialize table
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
		globalFilterFn: (row, columnId, filterValue) => {
			const email = String(row.getValue('email')).toLowerCase()
			return email.includes(String(filterValue).toLowerCase())
		},
	})

	// Handle row click
	const handleRowClick = useCallback(
		(email: string) => {
			if (email !== 'TOTAL') {
				onAgentClick(email, 'all')
			}
		},
		[onAgentClick]
	)

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<CardTitle className="text-lg sm:text-xl">
							{t('title')}
						</CardTitle>
						<CardDescription className="text-sm mt-1">
							{t('description')}
						</CardDescription>
					</div>
					<div className="relative w-full sm:max-w-sm">
						<IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={t('table.searchPlaceholder')}
							value={globalFilter}
							onChange={e => setGlobalFilter(e.target.value)}
							className="pl-10 text-sm"
						/>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<div className="rounded-md border overflow-x-auto">
					<Table className="min-w-[900px]">
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map(header => (
										<TableHead
											key={header.id}
											className={cn(
												header.column.getCanSort()
													? 'cursor-pointer select-none hover:bg-muted/50'
													: '',
												'text-center'
											)}
											onClick={header.column.getToggleSortingHandler()}
										>
											<div className="flex items-center justify-center gap-1">
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext()
														)}
												{{
													asc: ' ↑',
													desc: ' ↓',
												}[header.column.getIsSorted() as string] ?? null}
											</div>
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
											className="cursor-pointer hover:bg-muted/50 transition-colors"
											onClick={() => handleRowClick(row.original.email)}
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
									{/* Total row */}
									{totals && (
										<TableRow className="bg-muted/50 font-semibold border-t-2">
											<TableCell className="font-bold">
												{t('table.total')}
											</TableCell>
											<TableCell className="text-center">
												{totals.answeredTickets}
											</TableCell>
											<TableCell className="text-center">
												{totals.frtCount}
											</TableCell>
											<TableCell className="text-center">
												{renderFrt(totals.avgFrt, totals.frtCount)}
											</TableCell>
											<TableCell className="text-center">
												{renderFrt(totals.medianFrt, totals.frtCount)}
											</TableCell>
											<TableCell className="text-center">
												{renderFrt(totals.p90Frt, totals.frtCount)}
											</TableCell>
											{(() => {
												const percent = fulfillmentPercent(
													FRT_TARGET_HOURS,
													totals.medianFrt,
													totals.frtCount
												)
												return (
													<TableCell
														className={cn(
															'text-center',
															percent !== null && getFulfillmentColor(percent)
														)}
													>
														{percent !== null
															? `${percent.toFixed(0)}%`
															: '—'}
													</TableCell>
												)
											})()}
											<TableCell className="text-center">
												{renderFrt(
													totals.medianResolution,
													totals.resolutionCount
												)}
											</TableCell>
										</TableRow>
									)}
								</>
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
			</CardContent>
		</Card>
	)
}
