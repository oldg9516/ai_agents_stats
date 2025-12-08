'use client'

import { TableSkeleton } from '@/components/loading/table-skeleton'
import { ScoringModeToggle } from '@/components/scoring-mode-toggle'
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
import { getCategoryLabel } from '@/constants/category-labels'
import { useDetailedStatsPaginated } from '@/lib/queries/dashboard-queries'
import { useDashboardFilters } from '@/lib/store/hooks/use-dashboard-filters'
import type { DashboardFilters, DetailedStatsRow } from '@/lib/supabase/types'
import { exportToCSV } from '@/lib/utils/export'
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
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface DetailedStatsTableProps {
	filters: DashboardFilters
}

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
	const { scoringMode } = useDashboardFilters()

	// Server-side pagination state
	const [currentPage, setCurrentPage] = useState(0)
	const pageSize = 20

	// Fetch paginated data
	const {
		data,
		totalCount,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		isLoading,
		error,
		isFetching,
	} = useDetailedStatsPaginated(filters, currentPage, pageSize)

	// Client-side sorting and filtering (on current page only)
	// Note: Primary sorting (category → sortOrder → dates DESC) happens on server
	// This is only for optional client-side re-sorting of current page
	const [sorting, setSorting] = useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = useState('')

	// Handle category click
	const handleCategoryClick = (category: string) => {
		router.push(`/dashboard/category/${encodeURIComponent(category)}`)
	}

	// Helper to check if date is after new logic cutoff (11.11.2025)
	const isNewLogic = (dates: string | null): boolean => {
		if (!dates) return false // Version-level rows don't have dates

		// Extract SECOND date (end of week) from "DD.MM.YYYY — DD.MM.YYYY" format
		// This ensures that if the week includes 11.11.2025, it uses new logic
		const secondDate = dates.split(' — ')[1]
		const [day, month, year] = secondDate.split('.')
		const dateObj = new Date(`${year}-${month}-${day}`)
		const cutoffDate = new Date('2025-11-11')

		return dateObj >= cutoffDate
	}

	// Base columns (always shown)
	const baseColumns: ColumnDef<DetailedStatsRow>[] = [
		{
			accessorKey: 'category',
			header: t('table.category'),
			size: 200,
			maxSize: 200,
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const category = row.original.category

				if (isVersionLevel) {
					return (
						<div
							className='font-semibold cursor-pointer hover:text-primary transition-colors whitespace-normal max-w-[200px]'
							onClick={() => handleCategoryClick(category)}
						>
							{getCategoryLabel(category)}
						</div>
					)
				}

				return (
					<div className='pl-4 text-muted-foreground whitespace-normal max-w-[200px]'>
						{getCategoryLabel(category)}
					</div>
				)
			},
		},
		{
			accessorKey: 'version',
			header: t('table.version'),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				return (
					<div
						className={
							isVersionLevel ? 'font-semibold' : 'text-muted-foreground'
						}
					>
						{row.original.version}
					</div>
				)
			},
			// Custom sort function: extract version number and sort DESC (newest first)
			sortingFn: (rowA, rowB) => {
				const extractNum = (v: string) => {
					const match = v.match(/\d+/)
					return match ? parseInt(match[0]) : 0
				}
				return (
					extractNum(rowB.original.version) - extractNum(rowA.original.version)
				)
			},
		},
		{
			accessorKey: 'dates',
			header: t('table.dates'),
			cell: ({ getValue }) => {
				const value = getValue() as string | null
				return <div className='text-sm'>{value || '-'}</div>
			},
			// Custom sort function: extract first date from "DD.MM.YYYY — DD.MM.YYYY" format
			// Version-level rows (null dates) should appear first
			sortingFn: (rowA, rowB, columnId) => {
				const dateA = rowA.getValue(columnId) as string | null
				const dateB = rowB.getValue(columnId) as string | null

				// Null dates (version-level rows) always come first
				if (!dateA && !dateB) return 0
				if (!dateA) return -1
				if (!dateB) return 1

				// Extract first date from "DD.MM.YYYY — DD.MM.YYYY" format
				const firstDateA = dateA.split(' — ')[0]
				const firstDateB = dateB.split(' — ')[0]

				// Convert DD.MM.YYYY to YYYY-MM-DD for proper comparison
				const [dayA, monthA, yearA] = firstDateA.split('.')
				const [dayB, monthB, yearB] = firstDateB.split('.')
				const dateStrA = `${yearA}-${monthA}-${dayA}`
				const dateStrB = `${yearB}-${monthB}-${dayB}`

				// Compare dates as strings (YYYY-MM-DD format sorts correctly lexically)
				return dateStrA.localeCompare(dateStrB)
			},
		},
		{
			accessorKey: 'totalRecords',
			header: () => (
				<div className='text-center'>{t('table.totalRecords')}</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				return (
					<div
						className={isVersionLevel ? 'text-left font-semibold' : 'text-left'}
					>
						{row.original.totalRecords}
					</div>
				)
			},
		},
		{
			accessorKey: 'reviewedRecords',
			header: () => (
				<div className='text-center'>{t('table.reviewedRecords')}</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				return (
					<div
						className={isVersionLevel ? 'text-left font-semibold' : 'text-left'}
					>
						{row.original.reviewedRecords}
					</div>
				)
			},
		},
		{
			accessorKey: 'aiErrors',
			header: () => (
				<div className='text-center whitespace-pre-line'>
					{t('table.aiErrors')}
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const errors = row.original.aiErrors
				const reviewed = row.original.reviewedRecords
				const contextShifts = row.original.contextShifts || 0
				const evaluable = reviewed - contextShifts
				const percentage = evaluable > 0 ? (errors / evaluable) * 100 : 0
				return (
					<div
						className={isVersionLevel ? 'text-left font-semibold' : 'text-left'}
					>
						{errors} ({percentage.toFixed(1)}%)
					</div>
				)
			},
		},
		{
			accessorKey: 'aiQuality',
			header: () => (
				<div className='text-center text-sm whitespace-pre-line'>
					{t('table.aiQuality')}
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const quality = row.original.aiQuality
				const reviewed = row.original.reviewedRecords
				const contextShifts = row.original.contextShifts || 0
				const evaluable = reviewed - contextShifts
				const percentage = evaluable > 0 ? (quality / evaluable) * 100 : 0
				return (
					<div
						className={isVersionLevel ? 'text-left font-semibold' : 'text-left'}
					>
						{quality} ({percentage.toFixed(1)}%)
					</div>
				)
			},
		},
	]

	// Legacy mode columns (5 classifications)
	const legacyColumns: ColumnDef<DetailedStatsRow>[] = [
		// AI Failure Rate - Column Group
		{
			id: 'aiFailureGroup',
			header: () => (
				<div className='text-center text-xs'>{t('table.aiFailureRate')}</div>
			),
			columns: [
				{
					accessorKey: 'criticalErrors',
					header: () => (
						<div className='text-center text-sm'>{t('table.critical')}</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						// For week-level rows, check date cutoff; for version-level, show if has data
						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const total = row.original.totalRecords
						const contextShifts = row.original.contextShifts || 0
						const evaluable = total - contextShifts
						const count = row.original.criticalErrors

						// For version-level without new data, show dash
						if (isVersionLevel && count === 0 && evaluable === 0) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const percent =
							evaluable > 0 ? ((count / evaluable) * 100).toFixed(1) : '0.0'

						return (
							<div className='flex justify-left'>
								<span
									className={`inline-block rounded ${
										isVersionLevel
											? 'font-semibold text-foreground'
											: 'px-2 py-1 text-sm font-normal bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
									}`}
								>
									{count} ({percent}%)
								</span>
							</div>
						)
					},
				},
				{
					accessorKey: 'meaningfulImprovements',
					header: () => (
						<div className='text-center text-sm'>{t('table.meaningful')}</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						// For week-level rows, check date cutoff; for version-level, show if has data
						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const total = row.original.totalRecords
						const contextShifts = row.original.contextShifts || 0
						const evaluable = total - contextShifts
						const count = row.original.meaningfulImprovements

						// For version-level without new data, show dash
						if (isVersionLevel && count === 0 && evaluable === 0) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const percent =
							evaluable > 0 ? ((count / evaluable) * 100).toFixed(1) : '0.0'

						return (
							<div className='flex justify-left'>
								<span
									className={`inline-block rounded ${
										isVersionLevel
											? 'font-semibold text-foreground'
											: 'px-2 py-1 text-sm font-normal bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
									}`}
								>
									{count} ({percent}%)
								</span>
							</div>
						)
					},
				},
			],
		},
		// AI Success Rate - Column Group
		{
			id: 'aiSuccessGroup',
			header: () => (
				<div className='text-center text-xs'>{t('table.aiSuccessRate')}</div>
			),
			columns: [
				{
					accessorKey: 'stylisticPreferences',
					header: () => (
						<div className='text-center text-sm'>{t('table.stylistic')}</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						// For week-level rows, check date cutoff; for version-level, show if has data
						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const total = row.original.totalRecords
						const contextShifts = row.original.contextShifts || 0
						const evaluable = total - contextShifts
						const count = row.original.stylisticPreferences

						// For version-level without new data, show dash
						if (isVersionLevel && count === 0 && evaluable === 0) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const percent =
							evaluable > 0 ? ((count / evaluable) * 100).toFixed(1) : '0.0'

						return (
							<div className='flex justify-left'>
								<span
									className={`inline-block rounded ${
										isVersionLevel
											? 'font-semibold text-foreground'
											: 'px-2 py-1 text-sm font-normal bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
									}`}
								>
									{count} ({percent}%)
								</span>
							</div>
						)
					},
				},
				{
					accessorKey: 'noSignificantChanges',
					header: () => (
						<div className='text-center text-sm whitespace-pre-line'>
							{t('table.noChanges')}
						</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						// For week-level rows, check date cutoff; for version-level, show if has data
						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const total = row.original.totalRecords
						const contextShifts = row.original.contextShifts || 0
						const evaluable = total - contextShifts
						const count = row.original.noSignificantChanges

						// For version-level without new data, show dash
						if (isVersionLevel && count === 0 && evaluable === 0) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const percent =
							evaluable > 0 ? ((count / evaluable) * 100).toFixed(1) : '0.0'

						return (
							<div className='flex justify-left'>
								<span
									className={`inline-block rounded ${
										isVersionLevel
											? 'font-semibold text-foreground'
											: 'px-2 py-1 text-sm font-normal bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
									}`}
								>
									{count} ({percent}%)
								</span>
							</div>
						)
					},
				},
				{
					accessorKey: 'contextShifts',
					header: () => (
						<div className='text-center text-sm whitespace-pre-line'>
							{t('table.contextShift')}
						</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						// For week-level rows, check date cutoff; for version-level, show if has data
						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const total = row.original.totalRecords
						const count = row.original.contextShifts

						// For version-level without new data, show dash
						if (isVersionLevel && count === 0 && total === 0) {
							return (
								<div className='text-left text-muted-foreground text-sm'>-</div>
							)
						}

						const percent =
							total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'

						return (
							<div className='flex justify-left'>
								<span
									className={`inline-block rounded ${
										isVersionLevel
											? 'font-semibold text-foreground'
											: 'px-2 py-1 text-sm font-normal bg-gray-200 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400'
									}`}
								>
									{count} ({percent}%)
								</span>
							</div>
						)
					},
				},
			],
		},
	]

	// New mode columns (4 aggregated groups: Critical, Needs Work, Good, Excluded)
	const newColumns: ColumnDef<DetailedStatsRow>[] = [
		// Critical (Score 0-50): CRITICAL_FACT_ERROR + MAJOR_FUNCTIONAL_OMISSION
		{
			id: 'criticalGroup',
			header: () => (
				<div className='text-center text-sm whitespace-nowrap'>
					{t('ticketsReview.scoreGroups.critical')}
					<div className='text-xs text-muted-foreground'>(0-50%)</div>
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const count =
					(row.original.criticalFactErrors || 0) +
					(row.original.majorFunctionalOmissions || 0)
				const total = row.original.reviewedRecords
				const excluded =
					(row.original.exclWorkflowShifts || 0) +
					(row.original.exclDataDiscrepancies || 0)
				const evaluable = total - excluded
				const percent =
					evaluable > 0 ? ((count / evaluable) * 100).toFixed(1) : '0.0'

				if (count === 0 && evaluable === 0) {
					return (
						<div className='text-left text-muted-foreground text-sm'>-</div>
					)
				}

				return (
					<div className='flex justify-left'>
						<span
							className={`inline-block rounded ${
								isVersionLevel
									? 'font-semibold text-foreground'
									: 'px-2 py-1 text-sm font-normal bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
							}`}
						>
							{count} ({percent}%)
						</span>
					</div>
				)
			},
		},
		// Needs Work (Score 51-89): MINOR_INFO_GAP + CONFUSING_VERBOSITY + TONAL_MISALIGNMENT + STRUCTURAL_FIX
		{
			id: 'needsWorkGroup',
			header: () => (
				<div className='text-center text-sm whitespace-nowrap'>
					{t('ticketsReview.scoreGroups.needs_work')}
					<div className='text-xs text-muted-foreground'>(51%-89%)</div>
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const count =
					(row.original.minorInfoGaps || 0) +
					(row.original.confusingVerbosity || 0) +
					(row.original.tonalMisalignments || 0) +
					(row.original.structuralFixes || 0)
				const total = row.original.reviewedRecords
				const excluded =
					(row.original.exclWorkflowShifts || 0) +
					(row.original.exclDataDiscrepancies || 0)
				const evaluable = total - excluded
				const percent =
					evaluable > 0 ? ((count / evaluable) * 100).toFixed(1) : '0.0'

				if (count === 0 && evaluable === 0) {
					return (
						<div className='text-left text-muted-foreground text-sm'>-</div>
					)
				}

				return (
					<div className='flex justify-left'>
						<span
							className={`inline-block rounded ${
								isVersionLevel
									? 'font-semibold text-foreground'
									: 'px-2 py-1 text-sm font-normal bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
							}`}
						>
							{count} ({percent}%)
						</span>
					</div>
				)
			},
		},
		// Good (Score 90-100): STYLISTIC_EDIT + PERFECT_MATCH
		{
			id: 'goodGroup',
			header: () => (
				<div className='text-center text-sm whitespace-nowrap'>
					{t('ticketsReview.scoreGroups.good')}
					<div className='text-xs text-muted-foreground'>(90%-100%)</div>
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const count =
					(row.original.stylisticEdits || 0) +
					(row.original.perfectMatches || 0)
				const total = row.original.reviewedRecords
				const excluded =
					(row.original.exclWorkflowShifts || 0) +
					(row.original.exclDataDiscrepancies || 0)
				const evaluable = total - excluded
				const percent =
					evaluable > 0 ? ((count / evaluable) * 100).toFixed(1) : '0.0'

				if (count === 0 && evaluable === 0) {
					return (
						<div className='text-left text-muted-foreground text-sm'>-</div>
					)
				}

				return (
					<div className='flex justify-left'>
						<span
							className={`inline-block rounded ${
								isVersionLevel
									? 'font-semibold text-foreground'
									: 'px-2 py-1 text-sm font-normal bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
							}`}
						>
							{count} ({percent}%)
						</span>
					</div>
				)
			},
		},
		// Excluded: EXCL_WORKFLOW_SHIFT + EXCL_DATA_DISCREPANCY
		{
			id: 'excludedGroup',
			header: () => (
				<div className='text-center text-sm whitespace-nowrap'>
					{t('ticketsReview.scoreGroups.excluded')}
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const count =
					(row.original.exclWorkflowShifts || 0) +
					(row.original.exclDataDiscrepancies || 0)
				const total = row.original.reviewedRecords
				const percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'

				if (count === 0 && total === 0) {
					return (
						<div className='text-left text-muted-foreground text-sm'>-</div>
					)
				}

				return (
					<div className='flex justify-left'>
						<span
							className={`inline-block rounded ${
								isVersionLevel
									? 'font-semibold text-foreground'
									: 'px-2 py-1 text-sm font-normal bg-gray-200 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400'
							}`}
						>
							{count} ({percent}%)
						</span>
					</div>
				)
			},
		},
	]

	// Hidden sortOrder column
	const sortOrderColumn: ColumnDef<DetailedStatsRow> = {
		accessorKey: 'sortOrder',
		header: '',
		enableSorting: true,
		enableHiding: true,
	}

	// Define columns based on scoring mode
	const columns = useMemo<ColumnDef<DetailedStatsRow>[]>(
		() => [
			...baseColumns,
			...(scoringMode === 'legacy' ? legacyColumns : newColumns),
			sortOrderColumn,
		],
		[t, scoringMode]
	)

	// Find the latest week for each category (to highlight)
	const latestWeeksByCategory = useMemo(() => {
		const latestMap = new Map<string, string>()

		data.forEach(row => {
			// Only process week-level rows (sortOrder !== 1)
			if (row.sortOrder !== 1 && row.dates) {
				const category = row.category
				const version = row.version
				const key = `${category}-${version}`

				// Extract first date from "DD.MM.YYYY — DD.MM.YYYY" format
				const firstDate = row.dates.split(' — ')[0]
				const [day, month, year] = firstDate.split('.')
				const dateStr = `${year}-${month}-${day}` // YYYY-MM-DD for comparison

				// Check if this is the latest date for this category-version
				const existing = latestMap.get(key)
				if (!existing || dateStr > existing) {
					latestMap.set(key, dateStr)
				}
			}
		})

		return latestMap
	}, [data])

	// Helper to check if a row is the latest week for its category
	const isLatestWeek = (row: DetailedStatsRow): boolean => {
		if (row.sortOrder === 1 || !row.dates) return false

		const key = `${row.category}-${row.version}`
		const firstDate = row.dates.split(' — ')[0]
		const [day, month, year] = firstDate.split('.')
		const dateStr = `${year}-${month}-${day}`

		return latestWeeksByCategory.get(key) === dateStr
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
	const handleExport = () => {
		const filteredData = table
			.getFilteredRowModel()
			.rows.map(row => row.original)
		const today = new Date().toISOString().split('T')[0]
		exportToCSV(filteredData, `ai_stats_page${currentPage + 1}_${today}`)
	}

	// Handle page navigation
	const handlePreviousPage = () => {
		if (hasPreviousPage) {
			setCurrentPage(prev => prev - 1)
		}
	}

	const handleNextPage = () => {
		if (hasNextPage) {
			setCurrentPage(prev => prev + 1)
		}
	}

	const handlePageClick = (page: number) => {
		setCurrentPage(page)
	}

	// Show loading skeleton on initial load
	if (isLoading) {
		return <TableSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl text-destructive'>
						{t('errors.loadingTable')}
					</CardTitle>
					<CardDescription>{error.message}</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-col gap-3 sm:gap-4'>
					<div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
						<div className='flex-1 min-w-0'>
							<CardTitle className='text-lg sm:text-xl'>
								{t('table.detailedStatistics')}
							</CardTitle>
							<CardDescription className='text-sm mt-1'>
								{t('table.detailedStatisticsDesc')}
							</CardDescription>
						</div>

						{/* Export Button */}
						<Button
							onClick={handleExport}
							variant='outline'
							size='sm'
							className='w-full sm:w-auto'
						>
							<IconDownload className='mr-2 h-4 w-4' />
							{t('table.export')}
						</Button>
					</div>

					{/* Search Input & Scoring Mode Toggle */}
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
						<div className='relative w-full sm:max-w-sm'>
							<IconSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
							<Input
								placeholder={t('table.searchByCategory')}
								value={globalFilter}
								onChange={e => setGlobalFilter(e.target.value)}
								className='pl-10 text-sm'
							/>
						</div>
						<ScoringModeToggle />
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{/* Table */}
				<div className='rounded-md border overflow-x-auto'>
					<Table className='min-w-[640px]'>
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
									const isLatest = isLatestWeek(row.original)

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
										className='h-24 text-center'
									>
										{t('table.noResults')}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination - only show when no search filter */}
				{globalFilter ? (
					<div className='text-xs sm:text-sm text-muted-foreground text-center py-4'>
						{t('table.showing')} {table.getFilteredRowModel().rows.length}{' '}
						{t('table.of')} {totalCount} ({t('table.filtered')})
					</div>
				) : (
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4'>
						<div className='text-xs sm:text-sm text-muted-foreground text-center sm:text-left'>
							{t('table.showing')} {currentPage * pageSize + 1} {t('table.to')}{' '}
							{Math.min((currentPage + 1) * pageSize, totalCount)}{' '}
							{t('table.of')} {totalCount}
							{isFetching && !isLoading && (
								<span className='ml-2 inline-flex items-center gap-1'>
									<IconLoader2 className='h-3 w-3 animate-spin' />
									<span className='text-xs'>Loading...</span>
								</span>
							)}
						</div>
						<div className='flex flex-col sm:flex-row items-center gap-2'>
							<div className='flex items-center gap-2'>
								<Button
									variant='outline'
									size='sm'
									onClick={handlePreviousPage}
									disabled={!hasPreviousPage || isFetching}
									className='text-xs sm:text-sm'
								>
									<IconChevronLeft className='h-3 w-3 sm:h-4 sm:w-4' />
									<span className='hidden sm:inline'>{t('table.previous')}</span>
								</Button>
								<div className='flex items-center gap-1'>
									{Array.from({ length: totalPages }, (_, i) => i)
										.filter(page => {
											return (
												page === 0 ||
												page === totalPages - 1 ||
												Math.abs(page - currentPage) <= 1
											)
										})
										.map((page, idx, arr) => {
											const showEllipsis = idx > 0 && page - arr[idx - 1] > 1
											return (
												<div key={page} className='flex items-center'>
													{showEllipsis && (
														<span className='px-1 text-xs'>...</span>
													)}
													<Button
														variant={
															currentPage === page ? 'default' : 'outline'
														}
														size='sm'
														onClick={() => handlePageClick(page)}
														disabled={isFetching}
														className='w-7 h-7 sm:w-9 sm:h-9 text-xs sm:text-sm'
													>
														{page + 1}
													</Button>
												</div>
											)
										})}
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={handleNextPage}
									disabled={!hasNextPage || isFetching}
									className='text-xs sm:text-sm'
								>
									<span className='hidden sm:inline'>{t('table.next')}</span>
									<IconChevronRight className='h-3 w-3 sm:h-4 sm:w-4' />
								</Button>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
