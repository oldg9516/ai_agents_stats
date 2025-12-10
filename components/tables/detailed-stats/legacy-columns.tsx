'use client'

import type { DetailedStatsRow } from '@/lib/supabase/types'
import type { ColumnDef } from '@tanstack/react-table'
import { calcPercentage, getCellClassName, isNewLogic } from './types'

/**
 * Create legacy mode columns (5 classifications)
 * Used for data before the new scoring system was introduced
 */
export function createLegacyColumns(
	t: (key: string) => string
): ColumnDef<DetailedStatsRow>[] {
	return [
		// AI Failure Rate - Column Group
		{
			id: 'aiFailureGroup',
			header: () => (
				<div className="text-center text-xs">{t('table.aiFailureRate')}</div>
			),
			columns: [
				{
					accessorKey: 'criticalErrors',
					header: () => (
						<div className="text-center text-sm">{t('table.critical')}</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						// For week-level rows, check date cutoff; for version-level, show if has data
						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const total = row.original.totalRecords
						const contextShifts = row.original.contextShifts || 0
						const evaluable = total - contextShifts
						const count = row.original.criticalErrors

						// For version-level without new data, show dash
						if (isVersionLevel && count === 0 && evaluable === 0) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const percent = calcPercentage(count, evaluable)

						return (
							<div className="flex justify-left">
								<span
									className={`inline-block rounded ${getCellClassName(isVersionLevel, isVersionLevel ? undefined : 'red')}`}
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
						<div className="text-center text-sm">{t('table.meaningful')}</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const total = row.original.totalRecords
						const contextShifts = row.original.contextShifts || 0
						const evaluable = total - contextShifts
						const count = row.original.meaningfulImprovements

						if (isVersionLevel && count === 0 && evaluable === 0) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const percent = calcPercentage(count, evaluable)

						return (
							<div className="flex justify-left">
								<span
									className={`inline-block rounded ${getCellClassName(isVersionLevel, isVersionLevel ? undefined : 'orange')}`}
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
				<div className="text-center text-xs">{t('table.aiSuccessRate')}</div>
			),
			columns: [
				{
					accessorKey: 'stylisticPreferences',
					header: () => (
						<div className="text-center text-sm">{t('table.stylistic')}</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const total = row.original.totalRecords
						const contextShifts = row.original.contextShifts || 0
						const evaluable = total - contextShifts
						const count = row.original.stylisticPreferences

						if (isVersionLevel && count === 0 && evaluable === 0) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const percent = calcPercentage(count, evaluable)

						return (
							<div className="flex justify-left">
								<span
									className={`inline-block rounded ${getCellClassName(isVersionLevel, isVersionLevel ? undefined : 'blue')}`}
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
						<div className="text-center text-sm whitespace-pre-line">
							{t('table.noChanges')}
						</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const total = row.original.totalRecords
						const contextShifts = row.original.contextShifts || 0
						const evaluable = total - contextShifts
						const count = row.original.noSignificantChanges

						if (isVersionLevel && count === 0 && evaluable === 0) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const percent = calcPercentage(count, evaluable)

						return (
							<div className="flex justify-left">
								<span
									className={`inline-block rounded ${getCellClassName(isVersionLevel, isVersionLevel ? undefined : 'green')}`}
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
						<div className="text-center text-sm whitespace-pre-line">
							{t('table.contextShift')}
						</div>
					),
					cell: ({ row }) => {
						const isVersionLevel = row.original.sortOrder === 1
						const useNewLogic = isNewLogic(row.original.dates)

						if (!isVersionLevel && !useNewLogic) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const total = row.original.totalRecords
						const count = row.original.contextShifts

						if (isVersionLevel && count === 0 && total === 0) {
							return (
								<div className="text-left text-muted-foreground text-sm">-</div>
							)
						}

						const percent = calcPercentage(count, total)

						return (
							<div className="flex justify-left">
								<span
									className={`inline-block rounded ${getCellClassName(isVersionLevel, isVersionLevel ? undefined : 'gray')}`}
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
}
