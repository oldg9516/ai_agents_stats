/**
 * Parse plain text tables from message content
 */

export interface ParsedTableResult {
	before: string
	tableData: string[][] | null
	after: string
}

export function parseTextTable(content: string): ParsedTableResult {
	// Guard against null/undefined content
	if (!content) {
		return { before: '', tableData: null, after: '' }
	}

	const lines = content.split('\n')
	let tableStart = -1
	let tableEnd = -1

	// Find potential table by looking for aligned columns
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim()
		if (!line) continue

		// Check if line looks like a header (has multiple words separated by spaces/tabs)
		const parts = line.split(/\s{2,}|\t+/).filter(p => p.trim())
		if (parts.length >= 2) {
			if (tableStart === -1) {
				// Check if this could be a header
				const nextLine = lines[i + 1]?.trim()
				if (nextLine) {
					const nextParts = nextLine.split(/\s{2,}|\t+/).filter(p => p.trim())
					if (nextParts.length >= 2) {
						tableStart = i
					}
				}
			}
			tableEnd = i
		} else if (
			tableStart !== -1 &&
			line &&
			!line.match(/^\d|^[А-Яа-яA-Za-z]/)
		) {
			// Non-table content after table started
			break
		}
	}

	if (tableStart === -1 || tableEnd - tableStart < 1) {
		return { before: content, tableData: null, after: '' }
	}

	// Extract table data
	const tableLines = lines.slice(tableStart, tableEnd + 1)
	const tableData: string[][] = []

	for (const line of tableLines) {
		const trimmed = line.trim()
		if (!trimmed) continue
		const cells = trimmed
			.split(/\s{2,}|\t+/)
			.map(c => c.trim())
			.filter(c => c)
		if (cells.length >= 2) {
			tableData.push(cells)
		}
	}

	if (tableData.length < 2) {
		return { before: content, tableData: null, after: '' }
	}

	const before = lines.slice(0, tableStart).join('\n').trim()
	const after = lines.slice(tableEnd + 1).join('\n').trim()

	return { before, tableData, after }
}
