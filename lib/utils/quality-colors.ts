/**
 * Quality Color Utilities
 *
 * Helper functions for color coding based on quality percentage
 */

/**
 * Get color for quality percentage
 * @param percentage - Quality percentage (0-100)
 * @returns Hex color code
 */
export function getQualityColor(percentage: number): string {
	if (percentage >= 61) return '#10b981' // green-500
	if (percentage >= 31) return '#f59e0b' // amber-500
	return '#ef4444' // red-500
}

/**
 * Get background class for quality percentage
 * @param percentage - Quality percentage (0-100)
 * @returns Tailwind CSS class string
 */
export function getQualityBgClass(percentage: number): string {
	if (percentage >= 61)
		return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
	if (percentage >= 31)
		return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
	return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

/**
 * Get quality level label
 * @param percentage - Quality percentage (0-100)
 * @returns Quality level string
 */
export function getQualityLevel(percentage: number): 'Good' | 'Medium' | 'Poor' {
	if (percentage >= 61) return 'Good'
	if (percentage >= 31) return 'Medium'
	return 'Poor'
}
