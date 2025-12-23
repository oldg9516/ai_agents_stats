'use client'

import type { DetailedStatsRow } from '@/lib/supabase/types'
import type { ScoreGroup } from '@/constants/classification-types'
import type { ColumnDef } from '@tanstack/react-table'
import { calcPercentage, getCellClassName } from './types'

/**
 * Callback type for score group cell clicks
 */
export type ScoreGroupClickHandler = (params: {
	category: string
	version: string
	dates: string | null
	scoreGroup: ScoreGroup
}) => void

/**
 * Create new mode columns (4 aggregated groups: Critical, Needs Work, Good, Excluded)
 * Used for data after the new scoring system was introduced
 *
 * @param t - Translation function
 * @param onScoreGroupClick - Optional callback when a score group cell is clicked
 */
export function createNewColumns(
	t: (key: string) => string,
	onScoreGroupClick?: ScoreGroupClickHandler
): ColumnDef<DetailedStatsRow>[] {
	return [
		// Critical (Score 0-50): CRITICAL_FACT_ERROR + MAJOR_FUNCTIONAL_OMISSION
		{
			id: 'criticalGroup',
			header: () => (
				<div className="text-center text-sm whitespace-nowrap">
					{t('ticketsReview.scoreGroups.critical')}
					<div className="text-xs text-muted-foreground">(0-50%)</div>
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
				const percent = calcPercentage(count, evaluable)

				if (count === 0 && evaluable === 0) {
					return (
						<div className="text-left text-muted-foreground text-sm">-</div>
					)
				}

				// Version level - just display text, no click
				if (isVersionLevel) {
					return (
						<div className={`text-left text-sm ${getCellClassName(true)}`}>
							{count} ({percent}%)
						</div>
					)
				}

				// Week level - clickable button with colored background
				const handleClick = onScoreGroupClick
					? () =>
							onScoreGroupClick({
								category: row.original.category,
								version: row.original.version,
								dates: row.original.dates,
								scoreGroup: 'critical',
							})
					: undefined

				return (
					<div className="flex justify-left">
						<button
							type="button"
							onClick={handleClick}
							disabled={!onScoreGroupClick || count === 0}
							className={`inline-block px-2 py-1 rounded cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-red-400 transition-all disabled:cursor-default disabled:hover:ring-0 ${getCellClassName(false, 'red')}`}
						>
							{count} ({percent}%)
						</button>
					</div>
				)
			},
		},
		// Needs Work (Score 51-89): MINOR_INFO_GAP + CONFUSING_VERBOSITY + TONAL_MISALIGNMENT + STRUCTURAL_FIX
		{
			id: 'needsWorkGroup',
			header: () => (
				<div className="text-center text-sm whitespace-nowrap">
					{t('ticketsReview.scoreGroups.needs_work')}
					<div className="text-xs text-muted-foreground">(51%-89%)</div>
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
				const percent = calcPercentage(count, evaluable)

				if (count === 0 && evaluable === 0) {
					return (
						<div className="text-left text-muted-foreground text-sm">-</div>
					)
				}

				// Version level - just display text, no click
				if (isVersionLevel) {
					return (
						<div className={`text-left text-sm ${getCellClassName(true)}`}>
							{count} ({percent}%)
						</div>
					)
				}

				// Week level - clickable button with colored background
				const handleClick = onScoreGroupClick
					? () =>
							onScoreGroupClick({
								category: row.original.category,
								version: row.original.version,
								dates: row.original.dates,
								scoreGroup: 'needs_work',
							})
					: undefined

				return (
					<div className="flex justify-left">
						<button
							type="button"
							onClick={handleClick}
							disabled={!onScoreGroupClick || count === 0}
							className={`inline-block px-2 py-1 rounded cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-yellow-400 transition-all disabled:cursor-default disabled:hover:ring-0 ${getCellClassName(false, 'yellow')}`}
						>
							{count} ({percent}%)
						</button>
					</div>
				)
			},
		},
		// Good (Score 90-100): STYLISTIC_EDIT + PERFECT_MATCH
		{
			id: 'goodGroup',
			header: () => (
				<div className="text-center text-sm whitespace-nowrap">
					{t('ticketsReview.scoreGroups.good')}
					<div className="text-xs text-muted-foreground">(90%-100%)</div>
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
				const percent = calcPercentage(count, evaluable)

				if (count === 0 && evaluable === 0) {
					return (
						<div className="text-left text-muted-foreground text-sm">-</div>
					)
				}

				// Version level - just display text, no click
				if (isVersionLevel) {
					return (
						<div className={`text-left text-sm ${getCellClassName(true)}`}>
							{count} ({percent}%)
						</div>
					)
				}

				// Week level - clickable button with colored background
				const handleClick = onScoreGroupClick
					? () =>
							onScoreGroupClick({
								category: row.original.category,
								version: row.original.version,
								dates: row.original.dates,
								scoreGroup: 'good',
							})
					: undefined

				return (
					<div className="flex justify-left">
						<button
							type="button"
							onClick={handleClick}
							disabled={!onScoreGroupClick || count === 0}
							className={`inline-block px-2 py-1 rounded cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-green-400 transition-all disabled:cursor-default disabled:hover:ring-0 ${getCellClassName(false, 'green')}`}
						>
							{count} ({percent}%)
						</button>
					</div>
				)
			},
		},
		// Excluded: EXCL_WORKFLOW_SHIFT + EXCL_DATA_DISCREPANCY
		{
			id: 'excludedGroup',
			header: () => (
				<div className="text-center text-sm whitespace-nowrap">
					{t('ticketsReview.scoreGroups.excluded')}
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const count =
					(row.original.exclWorkflowShifts || 0) +
					(row.original.exclDataDiscrepancies || 0)
				const total = row.original.reviewedRecords
				const percent = calcPercentage(count, total)

				if (count === 0 && total === 0) {
					return (
						<div className="text-left text-muted-foreground text-sm">-</div>
					)
				}

				// Version level - just display text, no click
				if (isVersionLevel) {
					return (
						<div className={`text-left text-sm ${getCellClassName(true)}`}>
							{count} ({percent}%)
						</div>
					)
				}

				// Week level - clickable button with colored background
				const handleClick = onScoreGroupClick
					? () =>
							onScoreGroupClick({
								category: row.original.category,
								version: row.original.version,
								dates: row.original.dates,
								scoreGroup: 'excluded',
							})
					: undefined

				return (
					<div className="flex justify-left">
						<button
							type="button"
							onClick={handleClick}
							disabled={!onScoreGroupClick || count === 0}
							className={`inline-block px-2 py-1 rounded cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 transition-all disabled:cursor-default disabled:hover:ring-0 ${getCellClassName(false, 'gray')}`}
						>
							{count} ({percent}%)
						</button>
					</div>
				)
			},
		},
	]
}
