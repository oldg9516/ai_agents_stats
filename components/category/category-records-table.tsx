'use client'

import { useState } from 'react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { CategoryRecord } from '@/lib/supabase/types'
import { getClassificationColor } from '@/constants/classification-types'
import { ZOHO_TICKET_URL } from '@/constants/zoho'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import {
	IconChevronLeft,
	IconChevronRight,
	IconChevronsLeft,
	IconChevronsRight,
	IconDownload,
	IconExternalLink,
	IconSearch,
} from '@tabler/icons-react'

/**
 * Format classification name for display
 * Converts snake_case and UPPER_CASE to readable format
 */
function formatClassification(classification: string | null): string {
	if (!classification) return '-'

	// Convert UPPER_CASE to Title Case
	// e.g., "CRITICAL_FACT_ERROR" -> "Critical Fact Error"
	return classification
		.toLowerCase()
		.split('_')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

interface CategoryRecordsTableProps {
	data: CategoryRecord[]
	total: number
	page: number
	pageSize: number
	onPageChange: (page: number) => void
	onExport?: () => void
}

/**
 * Category Records Table Component
 *
 * Displays detailed records for a category with pagination
 * Features:
 * - Search functionality
 * - Sortable columns
 * - Pagination controls
 * - Export to CSV
 * - Responsive design (hides columns on mobile)
 */
export function CategoryRecordsTable({
	data,
	total,
	page,
	pageSize,
	onPageChange,
	onExport,
}: CategoryRecordsTableProps) {
	const t = useTranslations('category.recordsTable')
	const [searchQuery, setSearchQuery] = useState('')

	// Filter data by search query
	const filteredData = data.filter((record) => {
		const query = searchQuery.toLowerCase()
		return (
			record.id.toString().includes(query) ||
			record.version.toLowerCase().includes(query) ||
			record.agent.toLowerCase().includes(query) ||
			record.week.toLowerCase().includes(query)
		)
	})

	const totalPages = Math.ceil(total / pageSize)
	const canPreviousPage = page > 0
	const canNextPage = page < totalPages - 1

	// Open Zoho ticket in new tab
	const handleRowClick = (ticketId: string | null) => {
		if (ticketId) {
			window.open(`${ZOHO_TICKET_URL}${ticketId}`, '_blank', 'noopener,noreferrer')
		}
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
					<div>
						<CardTitle className='text-base sm:text-lg'>{t('title')}</CardTitle>
						<CardDescription className='text-xs sm:text-sm'>
							{t('description')}
						</CardDescription>
					</div>
					{onExport && (
						<Button
							variant='outline'
							size='sm'
							onClick={onExport}
							className='w-full sm:w-auto'
						>
							<IconDownload className='h-4 w-4 mr-2' />
							{t('export')}
						</Button>
					)}
				</div>

				{/* Search */}
				<div className='relative'>
					<IconSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder={t('searchPlaceholder')}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className='pl-9'
					/>
				</div>
			</CardHeader>

			<CardContent>
				<div className='rounded-md border overflow-auto'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className='w-[80px]'>{t('id')}</TableHead>
								<TableHead className='w-[100px]'>{t('version')}</TableHead>
								<TableHead className='hidden sm:table-cell w-[100px]'>
									{t('week')}
								</TableHead>
								<TableHead className='hidden md:table-cell'>
									{t('agent')}
								</TableHead>
								<TableHead>{t('status')}</TableHead>
								<TableHead className='hidden lg:table-cell'>
									{t('date')}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredData.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className='text-center text-muted-foreground py-8'
									>
										{searchQuery ? t('noResults') : t('noData')}
									</TableCell>
								</TableRow>
							) : (
								filteredData.map((record) => (
									<TableRow
										key={record.id}
										className={record.ticketId ? 'cursor-pointer hover:bg-muted/50' : ''}
										onClick={() => handleRowClick(record.ticketId)}
									>
										<TableCell className='font-mono text-xs'>
											<div className='flex items-center gap-1'>
												{record.id}
												{record.ticketId && (
													<IconExternalLink className='h-3 w-3 text-muted-foreground' />
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant='outline'>{record.version}</Badge>
										</TableCell>
										<TableCell className='hidden sm:table-cell text-sm text-muted-foreground'>
											{record.week}
										</TableCell>
										<TableCell className='hidden md:table-cell text-sm truncate max-w-[200px]'>
											{record.agent}
										</TableCell>
										<TableCell>
											{record.changeClassification ? (
												<span
													className={`inline-block px-2 py-1 text-xs rounded ${getClassificationColor(record.changeClassification)}`}
												>
													{formatClassification(record.changeClassification)}
												</span>
											) : (
												<span className='text-xs text-muted-foreground'>-</span>
											)}
										</TableCell>
										<TableCell className='hidden lg:table-cell text-sm text-muted-foreground'>
											{format(
												new Date(record.createdAt),
												'MMM dd, yyyy'
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<div className='flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t'>
					<div className='text-sm text-muted-foreground'>
						{t('showing', {
							from: page * pageSize + 1,
							to: Math.min((page + 1) * pageSize, total),
							total,
						})}
					</div>

					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => onPageChange(0)}
							disabled={!canPreviousPage}
						>
							<IconChevronsLeft className='h-4 w-4' />
							<span className='sr-only'>{t('firstPage')}</span>
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => onPageChange(page - 1)}
							disabled={!canPreviousPage}
						>
							<IconChevronLeft className='h-4 w-4' />
							<span className='sr-only'>{t('previousPage')}</span>
						</Button>

						<span className='text-sm font-medium'>
							{t('page', { current: page + 1, total: totalPages })}
						</span>

						<Button
							variant='outline'
							size='sm'
							onClick={() => onPageChange(page + 1)}
							disabled={!canNextPage}
						>
							<IconChevronRight className='h-4 w-4' />
							<span className='sr-only'>{t('nextPage')}</span>
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => onPageChange(totalPages - 1)}
							disabled={!canNextPage}
						>
							<IconChevronsRight className='h-4 w-4' />
							<span className='sr-only'>{t('lastPage')}</span>
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
