/**
 * Support thread status definitions with human-readable labels and colors
 * Based on actual statuses in support_threads_data table
 */

export const SUPPORT_STATUSES = {
	'AI Processing': {
		label: 'AI Processing',
		color: 'hsl(var(--chart-1))',
		bgColor: 'bg-blue-100 dark:bg-blue-900',
		textColor: 'text-blue-700 dark:text-blue-300',
	},
	'Data collected': {
		label: 'Data collected',
		color: 'hsl(var(--chart-2))',
		bgColor: 'bg-green-100 dark:bg-green-900',
		textColor: 'text-green-700 dark:text-green-300',
	},
	'Getting tracking data': {
		label: 'Getting tracking data',
		color: 'hsl(var(--chart-3))',
		bgColor: 'bg-yellow-100 dark:bg-yellow-900',
		textColor: 'text-yellow-700 dark:text-yellow-300',
	},
	'Got tracking data': {
		label: 'Got tracking data',
		color: 'hsl(var(--chart-4))',
		bgColor: 'bg-green-100 dark:bg-green-900',
		textColor: 'text-green-700 dark:text-green-300',
	},
	'Identifying': {
		label: 'Identifying',
		color: 'hsl(var(--chart-5))',
		bgColor: 'bg-purple-100 dark:bg-purple-900',
		textColor: 'text-purple-700 dark:text-purple-300',
	},
	'Identifying — Many users': {
		label: 'Identifying — Many users',
		color: 'hsl(var(--chart-1))',
		bgColor: 'bg-orange-100 dark:bg-orange-900',
		textColor: 'text-orange-700 dark:text-orange-300',
	},
	'Identifying — Not found': {
		label: 'Identifying — Not found',
		color: 'hsl(var(--chart-2))',
		bgColor: 'bg-red-100 dark:bg-red-900',
		textColor: 'text-red-700 dark:text-red-300',
	},
	'new': {
		label: 'New',
		color: 'hsl(var(--chart-3))',
		bgColor: 'bg-slate-100 dark:bg-slate-900',
		textColor: 'text-slate-700 dark:text-slate-300',
	},
	'Reply is ready': {
		label: 'Reply is ready',
		color: 'hsl(var(--chart-4))',
		bgColor: 'bg-green-100 dark:bg-green-900',
		textColor: 'text-green-700 dark:text-green-300',
	},
	'Reply not required': {
		label: 'Reply not required',
		color: 'hsl(var(--chart-5))',
		bgColor: 'bg-gray-100 dark:bg-gray-900',
		textColor: 'text-gray-700 dark:text-gray-300',
	},
	'ZOHO draft created': {
		label: 'ZOHO draft created',
		color: 'hsl(var(--chart-1))',
		bgColor: 'bg-indigo-100 dark:bg-indigo-900',
		textColor: 'text-indigo-700 dark:text-indigo-300',
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
