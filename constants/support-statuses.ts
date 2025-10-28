/**
 * Support thread status definitions with human-readable labels and colors
 */

export const SUPPORT_STATUSES = {
	pending_response: {
		label: 'Pending Response',
		color: 'hsl(var(--chart-1))',
		bgColor: 'bg-yellow-100 dark:bg-yellow-900',
		textColor: 'text-yellow-700 dark:text-yellow-300',
	},
	waiting_on_customer: {
		label: 'Waiting on Customer',
		color: 'hsl(var(--chart-2))',
		bgColor: 'bg-blue-100 dark:bg-blue-900',
		textColor: 'text-blue-700 dark:text-blue-300',
	},
	resolved: {
		label: 'Resolved',
		color: 'hsl(var(--chart-3))',
		bgColor: 'bg-green-100 dark:bg-green-900',
		textColor: 'text-green-700 dark:text-green-300',
	},
	escalated: {
		label: 'Escalated',
		color: 'hsl(var(--chart-4))',
		bgColor: 'bg-red-100 dark:bg-red-900',
		textColor: 'text-red-700 dark:text-red-300',
	},
	in_progress: {
		label: 'In Progress',
		color: 'hsl(var(--chart-5))',
		bgColor: 'bg-purple-100 dark:bg-purple-900',
		textColor: 'text-purple-700 dark:text-purple-300',
	},
} as const

export type SupportStatus = keyof typeof SUPPORT_STATUSES

/**
 * Get human-readable label for a status
 */
export function getStatusLabel(status: string | null): string {
	if (!status) return 'Unknown'
	return SUPPORT_STATUSES[status as SupportStatus]?.label || status
}

/**
 * Get color for a status
 */
export function getStatusColor(status: string | null): string {
	if (!status) return 'hsl(var(--muted))'
	return SUPPORT_STATUSES[status as SupportStatus]?.color || 'hsl(var(--muted))'
}

/**
 * Get all status values
 */
export function getAllStatuses(): SupportStatus[] {
	return Object.keys(SUPPORT_STATUSES) as SupportStatus[]
}
