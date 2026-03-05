'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	type ColumnDef,
	type SortingState,
	flexRender,
} from '@tanstack/react-table'
import { useRouter } from '@/i18n/routing'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { EvalIntentRow, EvalIntentStatus } from '@/lib/supabase/queries-eval'

interface EvalIntentTableProps {
	data: EvalIntentRow[]
}

function StatusBadge({ status }: { status: EvalIntentStatus }) {
	const variant = status === 'READY'
		? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
		: status === 'REVIEW'
			? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
			: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'

	return (
		<Badge variant='outline' className={cn('font-medium', variant)}>
			{status}
		</Badge>
	)
}

function AutoSendBadge({ enabled }: { enabled: boolean }) {
	return (
		<Badge variant={enabled ? 'default' : 'secondary'}>
			{enabled ? 'ON' : 'OFF'}
		</Badge>
	)
}

export function EvalIntentTable({ data }: EvalIntentTableProps) {
	const t = useTranslations('evalDashboard')
	const router = useRouter()
	const [sorting, setSorting] = useState<SortingState>([])

	const columns = useMemo<ColumnDef<EvalIntentRow>[]>(
		() => [
			{
				accessorKey: 'requestSubtype',
				header: t('table.intent'),
				cell: ({ row }) => {
					const subtype = row.original.requestSubtype
					const subSubtype = row.original.requestSubSubtype
					return (
						<div>
							<div className='font-medium'>{subtype}</div>
							{subSubtype && (
								<div className='text-xs text-muted-foreground'>{subSubtype}</div>
							)}
						</div>
					)
				},
			},
			{
				accessorKey: 'totalTickets',
				header: t('table.tickets'),
				cell: ({ getValue }) => getValue<number>(),
			},
			{
				accessorKey: 'criticalErrorRate',
				header: t('table.criticalErrorRate'),
				cell: ({ getValue }) => `${getValue<number>()}%`,
			},
			{
				accessorKey: 'safeToSendRate',
				header: t('table.safeToSendRate'),
				cell: ({ getValue }) => `${getValue<number>()}%`,
			},
			{
				accessorKey: 'systemActionBlockRate',
				header: t('table.systemActionBlock'),
				cell: ({ getValue }) => `${getValue<number>()}%`,
			},
			{
				accessorKey: 'autoSendEnabled',
				header: t('table.autoSend'),
				cell: ({ getValue }) => <AutoSendBadge enabled={getValue<boolean>()} />,
			},
			{
				accessorKey: 'status',
				header: t('table.status'),
				cell: ({ getValue }) => <StatusBadge status={getValue<EvalIntentStatus>()} />,
			},
		],
		[t]
	)

	const table = useReactTable({
		data,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	})

	const handleRowClick = (row: EvalIntentRow) => {
		const encodedId = encodeURIComponent(row.intentId)
		router.push(`/eval-dashboard/intent/${encodedId}`)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t('table.title')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className='overflow-x-auto'>
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map(header => (
										<TableHead
											key={header.id}
											className={cn(
												header.column.getCanSort() && 'cursor-pointer select-none'
											)}
											onClick={header.column.getToggleSortingHandler()}
										>
											{flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
											{header.column.getIsSorted() === 'asc' && ' ↑'}
											{header.column.getIsSorted() === 'desc' && ' ↓'}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.map(row => (
								<TableRow
									key={row.id}
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
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
}
