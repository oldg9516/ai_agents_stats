/**
 * Classification Types for AI-Human Comparison
 *
 * Legacy (v3.x): 5 classifications with binary quality calculation
 * New (v4.0): 10 classifications with penalty-based scoring
 */

// =============================================================================
// LEGACY CLASSIFICATIONS (v3.x)
// =============================================================================

export const LEGACY_CLASSIFICATION_TYPES = [
	'critical_error',
	'meaningful_improvement',
	'stylistic_preference',
	'no_significant_change',
	'context_shift',
] as const

export type LegacyClassificationType =
	(typeof LEGACY_CLASSIFICATION_TYPES)[number]

// =============================================================================
// NEW CLASSIFICATIONS (v4.0)
// =============================================================================

export const NEW_CLASSIFICATION_TYPES = [
	'CRITICAL_FACT_ERROR',
	'MAJOR_FUNCTIONAL_OMISSION',
	'MINOR_INFO_GAP',
	'CONFUSING_VERBOSITY',
	'TONAL_MISALIGNMENT',
	'STRUCTURAL_FIX',
	'STYLISTIC_EDIT',
	'PERFECT_MATCH',
	'EXCL_WORKFLOW_SHIFT',
	'EXCL_DATA_DISCREPANCY',
	'HUMAN_INCOMPLETE',
] as const

export type NewClassificationType = (typeof NEW_CLASSIFICATION_TYPES)[number]

// =============================================================================
// COMBINED (for backward compatibility)
// =============================================================================

export const CLASSIFICATION_TYPES = [
	...LEGACY_CLASSIFICATION_TYPES,
	...NEW_CLASSIFICATION_TYPES,
] as const

export type ClassificationType = (typeof CLASSIFICATION_TYPES)[number]

// =============================================================================
// PENALTY SCORES (v4.0)
// =============================================================================

/**
 * Penalty values for new classifications
 * Score = 100 + penalty (penalty is negative or zero)
 * null = excluded from scoring (N/A)
 */
export const CLASSIFICATION_PENALTIES: Record<
	NewClassificationType,
	number | null
> = {
	CRITICAL_FACT_ERROR: -100, // Score: 0
	MAJOR_FUNCTIONAL_OMISSION: -50, // Score: 50
	MINOR_INFO_GAP: -20, // Score: 80
	CONFUSING_VERBOSITY: -15, // Score: 85
	TONAL_MISALIGNMENT: -10, // Score: 90
	STRUCTURAL_FIX: -5, // Score: 95
	STYLISTIC_EDIT: -2, // Score: 98
	PERFECT_MATCH: 0, // Score: 100
	EXCL_WORKFLOW_SHIFT: null, // N/A - excluded
	EXCL_DATA_DISCREPANCY: null, // N/A - excluded
	HUMAN_INCOMPLETE: null, // N/A - excluded (human reply incomplete)
}

/**
 * Map legacy classifications to new ones (for unified scoring)
 */
export const LEGACY_TO_NEW_MAP: Record<
	LegacyClassificationType,
	NewClassificationType
> = {
	critical_error: 'CRITICAL_FACT_ERROR',
	meaningful_improvement: 'MINOR_INFO_GAP',
	stylistic_preference: 'STYLISTIC_EDIT',
	no_significant_change: 'PERFECT_MATCH',
	context_shift: 'EXCL_WORKFLOW_SHIFT',
}

/**
 * Map new classifications to legacy ones (for backwards compatibility in UI)
 * Used when displaying legacy columns with new classification data
 */
export const NEW_TO_LEGACY_MAP: Record<
	NewClassificationType,
	LegacyClassificationType
> = {
	CRITICAL_FACT_ERROR: 'critical_error',
	MAJOR_FUNCTIONAL_OMISSION: 'critical_error', // Серьезная ошибка -> critical
	MINOR_INFO_GAP: 'meaningful_improvement',
	CONFUSING_VERBOSITY: 'meaningful_improvement',
	TONAL_MISALIGNMENT: 'meaningful_improvement',
	STRUCTURAL_FIX: 'stylistic_preference',
	STYLISTIC_EDIT: 'stylistic_preference',
	PERFECT_MATCH: 'no_significant_change',
	EXCL_WORKFLOW_SHIFT: 'context_shift',
	EXCL_DATA_DISCREPANCY: 'context_shift', // Excluded -> context_shift
	HUMAN_INCOMPLETE: 'context_shift', // Excluded -> context_shift
}

// =============================================================================
// SCORE GROUPS (for UI display)
// =============================================================================

export type ScoreGroup = 'critical' | 'needs_work' | 'good' | 'excluded'

/**
 * Get score group based on quality score
 * Critical: 0-50, Needs Work: 51-89, Good: 90-100, Excluded: N/A
 */
export function getScoreGroup(score: number | null): ScoreGroup {
	if (score === null) return 'excluded'
	if (score <= 50) return 'critical'
	if (score <= 89) return 'needs_work'
	return 'good'
}

/**
 * Score group colors for UI
 */
export const SCORE_GROUP_COLORS: Record<ScoreGroup, string> = {
	critical:
		'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
	needs_work:
		'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
	good: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
	excluded:
		'bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800',
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if classification is new format (UPPER_CASE)
 */
export function isNewClassification(
	classification: string | null
): classification is NewClassificationType {
	if (!classification) return false
	return NEW_CLASSIFICATION_TYPES.includes(
		classification as NewClassificationType
	)
}

/**
 * Check if classification is legacy format (snake_case)
 */
export function isLegacyClassification(
	classification: string | null
): classification is LegacyClassificationType {
	if (!classification) return false
	return LEGACY_CLASSIFICATION_TYPES.includes(
		classification as LegacyClassificationType
	)
}

/**
 * Check if a string is a valid classification type (legacy or new)
 */
export function isValidClassification(
	value: unknown
): value is ClassificationType {
	return (
		typeof value === 'string' &&
		CLASSIFICATION_TYPES.includes(value as ClassificationType)
	)
}

/**
 * Calculate quality score from classification
 * Returns score (0-100) or null if excluded/invalid
 */
export function calculateQualityScore(
	classification: string | null
): number | null {
	if (!classification) return null

	// If new classification, use penalty directly
	if (isNewClassification(classification)) {
		const penalty = CLASSIFICATION_PENALTIES[classification]
		if (penalty === null) return null
		return 100 + penalty
	}

	// If legacy classification, map to new and calculate
	if (isLegacyClassification(classification)) {
		const newClassification = LEGACY_TO_NEW_MAP[classification]
		const penalty = CLASSIFICATION_PENALTIES[newClassification]
		if (penalty === null) return null
		return 100 + penalty
	}

	return null
}

/**
 * Check if classification should be excluded from scoring
 */
export function isExcludedClassification(
	classification: string | null
): boolean {
	if (!classification) return true

	if (isNewClassification(classification)) {
		return CLASSIFICATION_PENALTIES[classification] === null
	}

	if (isLegacyClassification(classification)) {
		return classification === 'context_shift'
	}

	return true
}

/**
 * Get classification color for UI badges
 */
export function getClassificationColor(classification: string | null): string {
	const score = calculateQualityScore(classification)
	const group = getScoreGroup(score)
	return SCORE_GROUP_COLORS[group]
}

// =============================================================================
// AI ERROR / QUALITY GROUPINGS (for detailed stats aggregation)
// =============================================================================

/**
 * Classifications that count as "AI Errors"
 * Legacy: critical_error, meaningful_improvement
 * New: CRITICAL_FACT_ERROR, MAJOR_FUNCTIONAL_OMISSION, MINOR_INFO_GAP, CONFUSING_VERBOSITY, TONAL_MISALIGNMENT
 */
export const AI_ERROR_CLASSIFICATIONS: ClassificationType[] = [
	// Legacy
	'critical_error',
	'meaningful_improvement',
	// New
	'CRITICAL_FACT_ERROR',
	'MAJOR_FUNCTIONAL_OMISSION',
	'MINOR_INFO_GAP',
	'CONFUSING_VERBOSITY',
	'TONAL_MISALIGNMENT',
]

/**
 * Classifications that count as "AI Quality" (good performance)
 * Legacy: no_significant_change, stylistic_preference
 * New: STRUCTURAL_FIX, STYLISTIC_EDIT, PERFECT_MATCH
 */
export const AI_QUALITY_CLASSIFICATIONS: ClassificationType[] = [
	// Legacy
	'no_significant_change',
	'stylistic_preference',
	// New
	'STRUCTURAL_FIX',
	'STYLISTIC_EDIT',
	'PERFECT_MATCH',
]

/**
 * All classifications that count as "reviewed" (any classification set)
 * Excludes null/unreviewed records
 */
export const ALL_REVIEWED_CLASSIFICATIONS: ClassificationType[] = [
	...CLASSIFICATION_TYPES,
]

/**
 * Check if classification is an AI error type
 */
export function isAiErrorClassification(
	classification: string | null
): boolean {
	if (!classification) return false
	return AI_ERROR_CLASSIFICATIONS.includes(classification as ClassificationType)
}

/**
 * Check if classification is an AI quality type
 */
export function isAiQualityClassification(
	classification: string | null
): boolean {
	if (!classification) return false
	return AI_QUALITY_CLASSIFICATIONS.includes(
		classification as ClassificationType
	)
}

/**
 * Check if classification is reviewed (not null and valid)
 */
export function isReviewedClassification(
	classification: string | null
): boolean {
	if (!classification) return false
	return ALL_REVIEWED_CLASSIFICATIONS.includes(
		classification as ClassificationType
	)
}

// =============================================================================
// AGENT CHANGE CLASSIFICATIONS (for agent stats page)
// =============================================================================

/**
 * Critical change classifications - real AI errors that needed fixing
 * Same as AI_ERROR_CLASSIFICATIONS but exported with different name for clarity
 * Legacy: critical_error, meaningful_improvement
 * New: CRITICAL_FACT_ERROR, MAJOR_FUNCTIONAL_OMISSION, MINOR_INFO_GAP, CONFUSING_VERBOSITY, TONAL_MISALIGNMENT
 */
export const CRITICAL_CHANGE_CLASSIFICATIONS: ClassificationType[] = [
	// Legacy
	'critical_error',
	'meaningful_improvement',
	// New
	'CRITICAL_FACT_ERROR',
	'MAJOR_FUNCTIONAL_OMISSION',
	'MINOR_INFO_GAP',
	'CONFUSING_VERBOSITY',
	'TONAL_MISALIGNMENT',
]

/**
 * Unnecessary change classifications - AI was correct but agent changed anyway
 * Same as AI_QUALITY_CLASSIFICATIONS but exported with different name for clarity
 * Legacy: stylistic_preference, no_significant_change
 * New: STRUCTURAL_FIX, STYLISTIC_EDIT, PERFECT_MATCH
 */
export const UNNECESSARY_CHANGE_CLASSIFICATIONS: ClassificationType[] = [
	// Legacy
	'stylistic_preference',
	'no_significant_change',
	// New
	'STRUCTURAL_FIX',
	'STYLISTIC_EDIT',
	'PERFECT_MATCH',
]

/**
 * Check if classification is a critical change (real AI error)
 */
export function isCriticalChangeClassification(
	classification: string | null
): boolean {
	if (!classification) return false
	return CRITICAL_CHANGE_CLASSIFICATIONS.includes(
		classification as ClassificationType
	)
}

/**
 * Check if classification is an unnecessary change (AI was correct)
 */
export function isUnnecessaryChangeClassification(
	classification: string | null
): boolean {
	if (!classification) return false
	return UNNECESSARY_CHANGE_CLASSIFICATIONS.includes(
		classification as ClassificationType
	)
}

// =============================================================================
// AI_APPROVED PRIORITY FUNCTIONS (for dashboard stats)
// =============================================================================

/**
 * Determine if a record counts as "quality" (good AI performance)
 * ai_approved = true → quality (priority)
 * ai_approved = false/null → use change_classification
 */
export function isQualityRecord(record: {
	ai_approved: boolean | null
	change_classification: string | null
}): boolean {
	// Priority: ai_approved = true
	if (record.ai_approved === true) {
		return true
	}
	// Fallback: change_classification (when ai_approved = false or null)
	return isAiQualityClassification(record.change_classification)
}

/**
 * Determine if a record counts as "error" (bad AI performance)
 * ai_approved = true → NOT an error
 * ai_approved = false/null → use change_classification
 */
export function isErrorRecord(record: {
	ai_approved: boolean | null
	change_classification: string | null
}): boolean {
	// Priority: ai_approved = true means NOT an error
	if (record.ai_approved === true) {
		return false
	}
	// Fallback: change_classification (when ai_approved = false or null)
	return isAiErrorClassification(record.change_classification)
}
