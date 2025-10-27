/**
 * Category Label Mappings
 *
 * Maps internal category names (request_subtype) to user-friendly display names
 */

export const CATEGORY_LABELS: Record<string, string> = {
	customization_request: 'Customization',
	shipping_or_delivery_question: 'Shipping',
	damaged_or_leaking_item_report: 'Damaged Items',
	skip_or_pause_request: 'Skip/Pause',
	frequency_change_request: 'Frequency',
	gratitude: 'Gratitude',
	return_request: 'Returns',
	cancellation_request: 'Cancellation',
	payment_issue: 'Payment',
	payment_question: 'Payment',
	product_question: 'Product Info',
	account_issue: 'Account',
	recipient_or_address_change: 'Address Change',
	other: 'Other',
}

/**
 * Get display label for a category
 * Falls back to formatted version of the category name if not in mapping
 */
export function getCategoryLabel(category: string): string {
	// Check if we have a predefined label
	if (CATEGORY_LABELS[category]) {
		return CATEGORY_LABELS[category]
	}

	// Fallback: Convert snake_case to Title Case
	return category
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}
