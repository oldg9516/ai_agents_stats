/**
 * Normalize a transparency-board search query.
 *
 * If the input is a Zoho ticket URL (or contains a long numeric ticket id),
 * extract just the id so pasting a full link finds the ticket. Otherwise
 * return the trimmed input unchanged (for email / subject searches).
 */
export function normalizeTicketSearch(input: string): string {
	const trimmed = input.trim()
	if (!trimmed) return ''

	// Zoho URL: .../tickets/details/{ticketId}[/conversation]
	const urlMatch = trimmed.match(/tickets\/details\/(\d+)/)
	if (urlMatch) return urlMatch[1]

	// Bare URL or text containing a long numeric id (Zoho ids are ~18 digits)
	if (/^https?:\/\//i.test(trimmed) || /\s/.test(trimmed)) {
		const idMatch = trimmed.match(/\d{10,}/)
		if (idMatch) return idMatch[0]
	}

	return trimmed
}
