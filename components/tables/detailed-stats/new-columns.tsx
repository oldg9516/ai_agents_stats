'use client'

import type { DateFilterMode, DetailedStatsRow } from '@/lib/supabase/types'
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
	dateFilterMode: DateFilterMode
}) => void

/**
 * Create new mode columns (4 aggregated groups: Critical, Needs Work, Good, Excluded)
 * Used for data after the new scoring system was introduced
 *
 * @param t - Translation function
 * @param onScoreGroupClick - Optional callback when a score group cell is clicked
 * @param dateFilterMode - Date field being used for filtering ('created' or 'human_reply')
 */
export function createNewColumns(
	t: (key: string) => string,
	onScoreGroupClick?: ScoreGroupClickHandler,
	dateFilterMode: DateFilterMode = 'created'
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
					(row.original.exclDataDiscrepancies || 0) +
					(row.original.humanIncomplete || 0)
				const aiApproved = row.original.aiApprovedCount || 0
				// evaluable = reviewed - excluded - aiApproved (ai_approved records are counted separately)
				const evaluable = total - excluded - aiApproved
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
								dateFilterMode,
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
		// Needs Work (Score 51-89): MINOR_INFO_GAP + CONFUSING_VERBOSITY + TONAL_MISALIGNMENT
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
					(row.original.tonalMisalignments || 0)
				const total = row.original.reviewedRecords
				const excluded =
					(row.original.exclWorkflowShifts || 0) +
					(row.original.exclDataDiscrepancies || 0) +
					(row.original.humanIncomplete || 0)
				const aiApproved = row.original.aiApprovedCount || 0
				// evaluable = reviewed - excluded - aiApproved (ai_approved records are counted separately)
				const evaluable = total - excluded - aiApproved
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
								dateFilterMode,
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
		// Good (Score 90-100): STRUCTURAL_FIX (95) + STYLISTIC_EDIT (98) + PERFECT_MATCH (100)
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
					(row.original.structuralFixes || 0) +
					(row.original.stylisticEdits || 0) +
					(row.original.perfectMatches || 0)
				const total = row.original.reviewedRecords
				const excluded =
					(row.original.exclWorkflowShifts || 0) +
					(row.original.exclDataDiscrepancies || 0) +
					(row.original.humanIncomplete || 0)
				const aiApproved = row.original.aiApprovedCount || 0
				// evaluable = reviewed - excluded - aiApproved (ai_approved records are counted separately)
				const evaluable = total - excluded - aiApproved
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
								dateFilterMode,
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
		// Excluded: v4.0 EXCL_WORKFLOW_SHIFT + EXCL_DATA_DISCREPANCY + HUMAN_INCOMPLETE (includes mapped legacy context_shift)
		{
			id: 'excludedGroup',
			header: () => (
				<div className="text-center text-sm whitespace-nowrap">
					{t('ticketsReview.scoreGroups.excluded')}
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				// Use v4.0 fields only (exclWorkflowShifts already includes mapped legacy context_shift)
				const count =
					(row.original.exclWorkflowShifts || 0) +
					(row.original.exclDataDiscrepancies || 0) +
					(row.original.humanIncomplete || 0)
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
								dateFilterMode,
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
		// AI Approved: Records manually marked as ai_approved = true (override classification)
		{
			id: 'aiApprovedGroup',
			header: () => (
				<div className="text-center text-sm whitespace-nowrap">
					{t('ticketsReview.scoreGroups.ai_approved')}
				</div>
			),
			cell: ({ row }) => {
				const isVersionLevel = row.original.sortOrder === 1
				const count = row.original.aiApprovedCount || 0
				const total = row.original.reviewedRecords
				const percent = calcPercentage(count, total)

				if (count === 0 && total === 0) {
					return (
						<div className="text-left text-muted-foreground text-sm">-</div>
					)
				}

				// Version level - just display text
				if (isVersionLevel) {
					return (
						<div className={`text-left text-sm ${getCellClassName(true)}`}>
							{count} ({percent}%)
						</div>
					)
				}

				// Week level - display with blue background (no click action)
				return (
					<div className="flex justify-left">
						<span
							className="inline-block px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
						>
							{count} ({percent}%)
						</span>
					</div>
				)
			},
		},
	]
}
