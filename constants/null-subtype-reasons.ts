/**
 * NULL Subtype Reason Definitions
 * Used when request_subtype is NULL - classified by reason
 * These match the SQL function get_request_category_stats classification
 */

export const NULL_SUBTYPE_REASONS = {
	'NULL (Reply not required)': {
		key: 'reply_not_required',
		label: 'Reply not required',
		labelRu: 'Ответ не требуется',
		description: 'Thread does not require a reply',
		bgColor: 'bg-gray-100 dark:bg-gray-900',
		textColor: 'text-gray-700 dark:text-gray-300',
		priority: 1,
	},
	'NULL (Identifying — Many users)': {
		key: 'identifying_many_users',
		label: 'Identifying — Many users',
		labelRu: 'Идентификация — Много пользователей',
		description: 'Multiple users found during identification',
		bgColor: 'bg-orange-100 dark:bg-orange-900',
		textColor: 'text-orange-700 dark:text-orange-300',
		priority: 2,
	},
	'NULL (Identifying — Not found)': {
		key: 'identifying_not_found',
		label: 'Identifying — Not found',
		labelRu: 'Идентификация — Не найден',
		description: 'User not found during identification',
		bgColor: 'bg-red-100 dark:bg-red-900',
		textColor: 'text-red-700 dark:text-red-300',
		priority: 3,
	},
	'NULL (Identifying)': {
		key: 'identifying',
		label: 'Identifying',
		labelRu: 'Идентификация',
		description: 'User identification in progress',
		bgColor: 'bg-purple-100 dark:bg-purple-900',
		textColor: 'text-purple-700 dark:text-purple-300',
		priority: 4,
	},
	'NULL (Subscription info missing)': {
		key: 'subscription_info_missing',
		label: 'Subscription info missing',
		labelRu: 'Нет информации о подписке',
		description: 'Subscription information needs to be collected',
		bgColor: 'bg-yellow-100 dark:bg-yellow-900',
		textColor: 'text-yellow-700 dark:text-yellow-300',
		priority: 5,
	},
	'NULL (Other)': {
		key: 'other',
		label: 'Other',
		labelRu: 'Другое',
		description: 'Other reasons for NULL subtype',
		bgColor: 'bg-slate-100 dark:bg-slate-900',
		textColor: 'text-slate-700 dark:text-slate-300',
		priority: 6,
	},
} as const

export type NullSubtypeReasonKey = keyof typeof NULL_SUBTYPE_REASONS

/**
 * Check if a subtype string is a NULL reason
 */
export function isNullReason(
	subtype: string | null
): subtype is NullSubtypeReasonKey {
	return subtype !== null && subtype in NULL_SUBTYPE_REASONS
}

/**
 * Get reason config for a NULL subtype
 */
export function getNullReasonConfig(subtype: string) {
	return NULL_SUBTYPE_REASONS[subtype as NullSubtypeReasonKey]
}

/**
 * Extract display label from NULL subtype
 * Returns the part inside parentheses: "NULL (Reply not required)" -> "Reply not required"
 */
export function getNullReasonLabel(subtype: string): string {
	const config = getNullReasonConfig(subtype)
	return config?.label ?? subtype.replace(/^NULL \(|\)$/g, '')
}
