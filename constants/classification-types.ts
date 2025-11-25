/**
 * Valid change classification types
 *
 * These are the only valid classifications for AI-human comparison records.
 * Used for filtering and validation across the application.
 */
export const CLASSIFICATION_TYPES = [
	'critical_error',
	'meaningful_improvement',
	'stylistic_preference',
	'no_significant_change',
	'context_shift',
] as const

export type ClassificationType = (typeof CLASSIFICATION_TYPES)[number]

/**
 * Check if a string is a valid classification type
 */
export function isValidClassification(value: unknown): value is ClassificationType {
	return typeof value === 'string' && CLASSIFICATION_TYPES.includes(value as ClassificationType)
}
