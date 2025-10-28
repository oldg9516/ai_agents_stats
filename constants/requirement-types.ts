/**
 * Support thread requirement flags with human-readable labels and descriptions
 */

export const REQUIREMENT_TYPES = {
	requires_reply: {
		key: 'requires_reply',
		label: 'Reply Required',
		shortLabel: 'Reply',
		description: 'Thread requires a customer response',
		color: 'hsl(var(--chart-1))',
		bgColor: 'bg-blue-100 dark:bg-blue-900',
		textColor: 'text-blue-700 dark:text-blue-300',
	},
	requires_identification: {
		key: 'requires_identification',
		label: 'Identification Required',
		shortLabel: 'ID',
		description: 'Customer identity verification needed',
		color: 'hsl(var(--chart-2))',
		bgColor: 'bg-purple-100 dark:bg-purple-900',
		textColor: 'text-purple-700 dark:text-purple-300',
	},
	requires_editing: {
		key: 'requires_editing',
		label: 'Editing Required',
		shortLabel: 'Edit',
		description: 'AI draft needs human editing',
		color: 'hsl(var(--chart-3))',
		bgColor: 'bg-yellow-100 dark:bg-yellow-900',
		textColor: 'text-yellow-700 dark:text-yellow-300',
	},
	requires_subscription_info: {
		key: 'requires_subscription_info',
		label: 'Subscription Info Required',
		shortLabel: 'Subscription',
		description: 'Subscription information needed',
		color: 'hsl(var(--chart-4))',
		bgColor: 'bg-green-100 dark:bg-green-900',
		textColor: 'text-green-700 dark:text-green-300',
	},
	requires_tracking_info: {
		key: 'requires_tracking_info',
		label: 'Tracking Info Required',
		shortLabel: 'Tracking',
		description: 'Tracking information needed',
		color: 'hsl(var(--chart-5))',
		bgColor: 'bg-orange-100 dark:bg-orange-900',
		textColor: 'text-orange-700 dark:text-orange-300',
	},
} as const

export type RequirementType = keyof typeof REQUIREMENT_TYPES

/**
 * Get requirement definition by key
 */
export function getRequirement(key: RequirementType) {
	return REQUIREMENT_TYPES[key]
}

/**
 * Get all requirement keys
 */
export function getAllRequirementKeys(): RequirementType[] {
	return Object.keys(REQUIREMENT_TYPES) as RequirementType[]
}

/**
 * Count active requirements in a thread
 */
export function countActiveRequirements(thread: Record<string, boolean>): number {
	return getAllRequirementKeys().filter((key) => thread[key] === true).length
}

/**
 * Get active requirement labels for a thread
 */
export function getActiveRequirements(thread: Record<string, boolean>): string[] {
	return getAllRequirementKeys()
		.filter((key) => thread[key] === true)
		.map((key) => REQUIREMENT_TYPES[key].shortLabel)
}
