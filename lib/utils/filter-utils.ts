/**
 * Count active filters (excluding date range, which has its own selector).
 *
 * Rules:
 * - Boolean filters: count if true
 * - Array filters: count if non-empty (and, if totalOptions provided, fewer than all selected)
 * - Date range is always excluded (has its own selector)
 */
export function getActiveFilterCount(
	filters: object,
	totalOptions?: Record<string, string[]>
): number {
	let count = 0

	for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
		if (key === 'dateRange') continue

		if (typeof value === 'number') {
			count++
		} else if (typeof value === 'boolean' && value) {
			count++
		} else if (Array.isArray(value) && value.length > 0) {
			// If we know total options, only count if fewer than all are selected
			if (totalOptions?.[key] && value.length >= totalOptions[key].length) continue
			count++
		}
	}

	return count
}

/**
 * Check if a ticket has been reviewed.
 * A ticket is considered reviewed if it was marked as processed OR has a manual comment.
 */
export function isTicketReviewed(ticket: {
	review_status?: string | null
	manual_comment?: string | null
}): boolean {
	return ticket.review_status === 'processed' || ticket.manual_comment != null
}
