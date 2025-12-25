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
import type { AgentStatsRow, AgentChangeType } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface AgentsStatsTableProps {
	data: AgentStatsRow[]
	totals: AgentStatsRow | null
	onAgentClick: (email: string, changeType: AgentChangeType) => void
}

/**
 * Get color classes based on efficiency percentage
 */
function getEfficiencyColor(efficiency: number): string {
	if (efficiency >= 90) {
		return 'text-green-600 dark:text-green-400 font-semibold'
	}
	if (efficiency >= 70) {
		return 'text-yellow-600 dark:text-yellow-400 font-semibold'
	}
	return 'text-red-600 dark:text-red-400 font-semibold'
}

/**
 * Get color classes for unnecessary changes (lower is better)
 */
function getUnnecessaryColor(percent: number): string {
	if (percent <= 10) {
		return 'text-green-600 dark:text-green-400'
	}
	if (percent <= 30) {
		return 'text-yellow-600 dark:text-yellow-400'
	}
	return 'text-red-600 dark:text-red-400'
}

/**
 * Agents Stats Table
 *
 * Features:
 * - Sorting
 * - Search by email
 * - Click row to open modal with agent's changes
 * - Color coding for efficiency metrics
 * - Total row at bottom
 */
export function AgentsStatsTable({
	data,
	totals,
	onAgentClick,
}: AgentsStatsTableProps) {
	const t = useTranslations('agentsStats')
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'aiEfficiency', desc: true },
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
				accessorKey: 'aiReviewed',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.aiReviewed')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t('tooltips.aiReviewed')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center">{row.original.aiReviewed}</div>
				),
			},
			{
				accessorKey: 'changed',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.changed')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t('tooltips.changed')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center">{row.original.changed}</div>
				),
			},
			{
				accessorKey: 'criticalErrors',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.criticalErrors')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t('tooltips.criticalErrors')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div className="text-center text-red-600 dark:text-red-400">
						{row.original.criticalErrors}
					</div>
				),
			},
			{
				accessorKey: 'unnecessaryChangesPercent',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.unnecessaryChanges')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t('tooltips.unnecessaryChanges')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div
						className={cn(
							'text-center',
							getUnnecessaryColor(row.original.unnecessaryChangesPercent)
						)}
					>
						{row.original.unnecessaryChangesPercent.toFixed(1)}%
					</div>
				),
			},
			{
				accessorKey: 'aiEfficiency',
				header: () => (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 cursor-help">
									{t('table.aiEfficiency')}
									<IconInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t('tooltips.aiEfficiency')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
				cell: ({ row }) => (
					<div
						className={cn(
							'text-center',
							getEfficiencyColor(row.original.aiEfficiency)
						)}
					>
						{row.original.aiEfficiency.toFixed(1)}%
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
					<Table className="min-w-[800px]">
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
												{totals.aiReviewed}
											</TableCell>
											<TableCell className="text-center">
												{totals.changed}
											</TableCell>
											<TableCell className="text-center text-red-600 dark:text-red-400">
												{totals.criticalErrors}
											</TableCell>
											<TableCell
												className={cn(
													'text-center',
													getUnnecessaryColor(totals.unnecessaryChangesPercent)
												)}
											>
												{totals.unnecessaryChangesPercent.toFixed(1)}%
											</TableCell>
											<TableCell
												className={cn(
													'text-center',
													getEfficiencyColor(totals.aiEfficiency)
												)}
											>
												{totals.aiEfficiency.toFixed(1)}%
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
