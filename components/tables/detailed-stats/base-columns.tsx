'use client'

import { getCategoryLabel } from '@/constants/category-labels'
import type { DetailedStatsRow } from '@/lib/supabase/types'
import type { ColumnDef } from '@tanstack/react-table'

/**
 * Create base columns for the detailed stats table
 * These columns are always shown regardless of scoring mode
 */
export function createBaseColumns(
	t: (key: string) => string,
	handleCategoryClick: (category: string) => void
): ColumnDef<DetailedStatsRow>[] {
	return [
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
							className="font-semibold cursor-pointer hover:text-primary transition-colors whitespace-normal max-w-[200px]"
							onClick={() => handleCategoryClick(category)}
						>
							{getCategoryLabel(category)}
						</div>
					)
				}

				return (
					<div className="pl-4 text-muted-foreground whitespace-normal max-w-[200px]">
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
				return <div className="text-sm">{value || '-'}</div>
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
				<div className="text-center">{t('table.totalRecords')}</div>
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
				<div className="text-center">{t('table.reviewedRecords')}</div>
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
				<div className="text-center whitespace-pre-line">
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
				<div className="text-center text-sm whitespace-pre-line">
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
}

/**
 * Hidden sortOrder column for maintaining row hierarchy
 */
export const sortOrderColumn: ColumnDef<DetailedStatsRow> = {
	accessorKey: 'sortOrder',
	header: '',
	enableSorting: true,
	enableHiding: true,
}
