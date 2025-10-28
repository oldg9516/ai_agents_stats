/**
 * Support request type definitions with human-readable labels
 */

export const REQUEST_TYPES = {
	general_inquiry: {
		label: 'General Inquiry',
		description: 'General questions and information requests',
	},
	subscription_support: {
		label: 'Subscription Support',
		description: 'Subscription-related questions and issues',
	},
	tracking_inquiry: {
		label: 'Tracking Inquiry',
		description: 'Package tracking and shipping questions',
	},
	order_modification: {
		label: 'Order Modification',
		description: 'Changes to existing orders',
	},
	product_question: {
		label: 'Product Question',
		description: 'Questions about products and services',
	},
	technical_issue: {
		label: 'Technical Issue',
		description: 'Technical problems and troubleshooting',
	},
	complaint: {
		label: 'Complaint',
		description: 'Customer complaints and feedback',
	},
	other: {
		label: 'Other',
		description: 'Other request types',
	},
} as const

export type RequestType = keyof typeof REQUEST_TYPES

/**
 * Get human-readable label for a request type
 */
export function getRequestTypeLabel(requestType: string | null): string {
	if (!requestType) return 'Unknown'
	return REQUEST_TYPES[requestType as RequestType]?.label || requestType
}

/**
 * Get all request types
 */
export function getAllRequestTypes(): RequestType[] {
	return Object.keys(REQUEST_TYPES) as RequestType[]
}
