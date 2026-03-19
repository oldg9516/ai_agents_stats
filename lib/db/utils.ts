/**
 * Database Query Utilities
 * Pure functions for trend calculation, date grouping, and classification counting
 */

import { isNotNull } from 'drizzle-orm'

import { db } from './index'
import { supportThreadsData } from './schema'
import type { TrendData } from './types'

/**
 * Calculate trend data from current and previous values
 */
export function calculateTrend(current: number, previous: number): TrendData {
	const value = current - previous
	const percentage =
		previous === 0 ? 0 : ((current - previous) / previous) * 100

	let direction: 'up' | 'down' | 'neutral' = 'neutral'
	if (value > 0) direction = 'up'
	else if (value < 0) direction = 'down'

	return {
		value: Math.abs(value),
		percentage: Math.abs(percentage),
		direction,
	}
}

/**
 * Get date range for previous period (same duration as current)
 */
export function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
	const duration = to.getTime() - from.getTime()
	const previousTo = new Date(from.getTime() - 1) // 1ms before current from
	const previousFrom = new Date(previousTo.getTime() - duration)

	return {
		from: previousFrom,
		to: previousTo,
	}
}

/**
 * Extract numeric version from version string (e.g., "v1" -> 1, "v2" -> 2)
 */
export function extractVersionNumber(version: string): number {
	const match = version.match(/\d+/)
	return match ? parseInt(match[0]) : 0
}

/**
 * Get week start date (Monday) in ISO format
 */
export function getWeekStart(date: Date): string {
	const day = date.getDay()
	const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
	const monday = new Date(date.setDate(diff))
	monday.setHours(0, 0, 0, 0)
	return monday.toISOString()
}

/**
 * Get day start date in ISO format
 */
export function getDayStart(date: Date): string {
	const dayStart = new Date(date)
	dayStart.setHours(0, 0, 0, 0)
	return dayStart.toISOString()
}

/**
 * Format date as DD.MM.YYYY
 */
export function formatDate(date: Date): string {
	const day = String(date.getDate()).padStart(2, '0')
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const year = date.getFullYear()
	return `${day}.${month}.${year}`
}

/**
 * Type for records used in classification counting
 */
export type ClassificationRecord = {
	change_classification: string | null
}

/**
 * Type for classification counts result
 */
export type ClassificationCounts = {
	// Legacy classifications - combined legacy + new
	criticalErrors: number
	meaningfulImprovements: number
	stylisticPreferences: number
	noSignificantChanges: number
	contextShifts: number
	// New classifications - combine legacy + new for unified view
	criticalFactErrors: number
	majorFunctionalOmissions: number
	minorInfoGaps: number
	confusingVerbosity: number
	tonalMisalignments: number
	structuralFixes: number
	stylisticEdits: number
	perfectMatches: number
	exclWorkflowShifts: number
	exclDataDiscrepancies: number
	averageScore: number | null
}

/**
 * Count change classifications (legacy and new) from records
 * Bidirectional mapping for compatibility:
 * Legacy -> New: critical_error -> CRITICAL_FACT_ERROR, etc.
 * New -> Legacy: CRITICAL_FACT_ERROR -> critical_error, MAJOR_FUNCTIONAL_OMISSION -> critical_error, etc.
 */
export function countClassifications(
	records: ClassificationRecord[]
): ClassificationCounts {
	// Legacy classifications (v3.x)
	const legacyCriticalErrors = records.filter(
		r => r.change_classification === 'critical_error'
	).length
	const legacyMeaningfulImprovements = records.filter(
		r => r.change_classification === 'meaningful_improvement'
	).length
	const legacyStylisticPreferences = records.filter(
		r => r.change_classification === 'stylistic_preference'
	).length
	const legacyNoSignificantChanges = records.filter(
		r => r.change_classification === 'no_significant_change'
	).length
	const legacyContextShifts = records.filter(
		r => r.change_classification === 'context_shift'
	).length

	// New classifications (v4.0)
	const newCriticalFactErrors = records.filter(
		r => r.change_classification === 'CRITICAL_FACT_ERROR'
	).length
	const newMajorFunctionalOmissions = records.filter(
		r => r.change_classification === 'MAJOR_FUNCTIONAL_OMISSION'
	).length
	const newMinorInfoGaps = records.filter(
		r => r.change_classification === 'MINOR_INFO_GAP'
	).length
	const newConfusingVerbosity = records.filter(
		r => r.change_classification === 'CONFUSING_VERBOSITY'
	).length
	const newTonalMisalignments = records.filter(
		r => r.change_classification === 'TONAL_MISALIGNMENT'
	).length
	const newStructuralFixes = records.filter(
		r => r.change_classification === 'STRUCTURAL_FIX'
	).length
	const newStylisticEdits = records.filter(
		r => r.change_classification === 'STYLISTIC_EDIT'
	).length
	const newPerfectMatches = records.filter(
		r => r.change_classification === 'PERFECT_MATCH'
	).length
	const newExclWorkflowShifts = records.filter(
		r => r.change_classification === 'EXCL_WORKFLOW_SHIFT'
	).length
	const newExclDataDiscrepancies = records.filter(
		r => r.change_classification === 'EXCL_DATA_DISCREPANCY'
	).length

	// Legacy columns: combine legacy + new classifications
	// critical_error + CRITICAL_FACT_ERROR + MAJOR_FUNCTIONAL_OMISSION
	const criticalErrors =
		legacyCriticalErrors + newCriticalFactErrors + newMajorFunctionalOmissions
	// meaningful_improvement + MINOR_INFO_GAP + CONFUSING_VERBOSITY + TONAL_MISALIGNMENT
	const meaningfulImprovements =
		legacyMeaningfulImprovements +
		newMinorInfoGaps +
		newConfusingVerbosity +
		newTonalMisalignments
	// stylistic_preference + STRUCTURAL_FIX + STYLISTIC_EDIT
	const stylisticPreferences =
		legacyStylisticPreferences + newStructuralFixes + newStylisticEdits
	// no_significant_change + PERFECT_MATCH
	const noSignificantChanges = legacyNoSignificantChanges + newPerfectMatches
	// context_shift + EXCL_WORKFLOW_SHIFT + EXCL_DATA_DISCREPANCY
	const contextShifts =
		legacyContextShifts + newExclWorkflowShifts + newExclDataDiscrepancies

	return {
		// Legacy classifications - combined legacy + new
		criticalErrors,
		meaningfulImprovements,
		stylisticPreferences,
		noSignificantChanges,
		contextShifts,
		// New classifications - combine legacy + new for unified view
		criticalFactErrors: newCriticalFactErrors + legacyCriticalErrors,
		majorFunctionalOmissions: newMajorFunctionalOmissions,
		minorInfoGaps: newMinorInfoGaps + legacyMeaningfulImprovements,
		confusingVerbosity: newConfusingVerbosity,
		tonalMisalignments: newTonalMisalignments,
		structuralFixes: newStructuralFixes,
		stylisticEdits: newStylisticEdits + legacyStylisticPreferences,
		perfectMatches: newPerfectMatches + legacyNoSignificantChanges,
		exclWorkflowShifts: newExclWorkflowShifts + legacyContextShifts,
		exclDataDiscrepancies: newExclDataDiscrepancies,
		averageScore: null,
	}
}

/**
 * List of AI error classification types (legacy + new)
 */
export const AI_ERROR_CLASSIFICATIONS = [
	'critical_error',
	'meaningful_improvement',
	'CRITICAL_FACT_ERROR',
	'MAJOR_FUNCTIONAL_OMISSION',
	'MINOR_INFO_GAP',
	'CONFUSING_VERBOSITY',
	'TONAL_MISALIGNMENT',
] as const

/**
 * List of AI quality classification types (legacy + new)
 */
export const AI_QUALITY_CLASSIFICATIONS = [
	'no_significant_change',
	'stylistic_preference',
	'STRUCTURAL_FIX',
	'STYLISTIC_EDIT',
	'PERFECT_MATCH',
] as const

/**
 * Check if a classification is an AI error type
 */
export function isAiErrorClassification(
	classification: string | null
): boolean {
	return (AI_ERROR_CLASSIFICATIONS as readonly string[]).includes(
		classification ?? ''
	)
}

/**
 * Check if a classification is an AI quality type
 */
export function isAiQualityClassification(
	classification: string | null
): boolean {
	return (AI_QUALITY_CLASSIFICATIONS as readonly string[]).includes(
		classification ?? ''
	)
}

// ============================================================================
// Thread ID fetching utilities (rewritten from Supabase to Drizzle)
// ============================================================================

/**
 * Fetch thread_ids from support_threads_data based on action_analysis.requires_system_action value
 * Parses action_analysis JSON text field and filters by requires_system_action.
 * Threads with null/missing action_analysis are treated as requires_system_action = false.
 *
 * @param requiresSystemAction - true to get threads that need system action, false for those that don't
 * @returns Array of thread_ids
 */
export async function fetchThreadIdsBySystemAction(
	requiresSystemAction: boolean
): Promise<string[]> {
	const results: string[] = []

	// Build query — when looking for requires_system_action=true, skip rows with no action_analysis
	const baseQuery = requiresSystemAction
		? db
				.select({
					threadId: supportThreadsData.threadId,
					actionAnalysis: supportThreadsData.actionAnalysis,
				})
				.from(supportThreadsData)
				.where(isNotNull(supportThreadsData.actionAnalysis))
		: db
				.select({
					threadId: supportThreadsData.threadId,
					actionAnalysis: supportThreadsData.actionAnalysis,
				})
				.from(supportThreadsData)

	const rows = await baseQuery

	for (const row of rows) {
		let isSystemAction = false
		if (row.actionAnalysis) {
			try {
				const parsed =
					typeof row.actionAnalysis === 'string'
						? JSON.parse(row.actionAnalysis)
						: row.actionAnalysis
				isSystemAction = parsed.requires_system_action === true
			} catch {
				// Parse error — treat as no system action
			}
		}

		if (requiresSystemAction && isSystemAction) {
			results.push(row.threadId)
		} else if (!requiresSystemAction && !isSystemAction) {
			results.push(row.threadId)
		}
	}

	return results
}

/**
 * Fetch thread_ids from support_threads_data where action_analysis.requires_system_action = true
 * Used as whitelist when "Show Only Requires System Action" filter is enabled
 *
 * @returns Array of thread_ids to INCLUDE (those that require system action)
 */
export async function fetchRequiresSystemActionThreadIds(): Promise<string[]> {
	return fetchThreadIdsBySystemAction(true)
}

/**
 * Fetch thread_ids based on showNeedEdit and showNotNeedEdit filters
 * Uses action_analysis.requires_system_action from support_threads_data
 * Returns null if both are true (no filtering needed) or empty array if both false
 *
 * @param showNeedEdit - Show records where action_analysis.requires_system_action = true
 * @param showNotNeedEdit - Show records where action_analysis.requires_system_action is false/null
 * @returns Array of thread_ids to include, or null if no filtering needed, or empty array if nothing to show
 */
export async function fetchFilteredThreadIds(
	showNeedEdit: boolean,
	showNotNeedEdit: boolean
): Promise<string[] | null> {
	// Both true - no filtering needed
	if (showNeedEdit && showNotNeedEdit) {
		return null
	}

	// Both false - show nothing
	if (!showNeedEdit && !showNotNeedEdit) {
		return []
	}

	// Only one is true - fetch the corresponding thread_ids
	if (showNeedEdit) {
		return fetchThreadIdsBySystemAction(true)
	} else {
		return fetchThreadIdsBySystemAction(false)
	}
}
