/**
 * CSV Export Utilities
 *
 * Helper functions for exporting data to CSV format
 */

import type { DetailedStatsRow } from '@/lib/supabase/types'

/**
 * Convert detailed stats data to CSV format
 * @param data - Array of detailed stats rows
 * @param filename - Output filename (without extension)
 */
export function exportToCSV(data: DetailedStatsRow[], filename: string = 'ai_stats') {
	if (data.length === 0) {
		console.warn('No data to export')
		return
	}

	// Define CSV headers
	const headers = [
		'Category',
		'Version',
		'Dates',
		'Total Records',
		'Records Qualified Agents',
		'Changed Records',
		'Good Percentage',
		'Critical Errors',
		'Meaningful Improvements',
		'No Significant Changes',
		'Stylistic Preferences',
	]

	// Convert data to CSV rows
	const rows = data.map((row) => [
		row.category,
		row.version,
		row.dates || '-',
		row.totalRecords.toString(),
		row.recordsQualifiedAgents.toString(),
		row.changedRecords.toString(),
		`${row.goodPercentage.toFixed(1)}%`,
		row.criticalErrors?.toString() || '0',
		row.meaningfulImprovements?.toString() || '0',
		row.noSignificantChanges?.toString() || '0',
		row.stylisticPreferences?.toString() || '0',
	])

	// Combine headers and rows
	const csvContent = [headers, ...rows]
		.map((row) =>
			row
				.map((cell) => {
					// Escape quotes and wrap in quotes if contains comma or newline
					const escaped = cell.replace(/"/g, '""')
					return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped
				})
				.join(',')
		)
		.join('\n')

	// Create blob and download
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
	const link = document.createElement('a')
	const url = URL.createObjectURL(blob)

	link.setAttribute('href', url)
	link.setAttribute('download', `${filename}.csv`)
	link.style.visibility = 'hidden'

	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)

	URL.revokeObjectURL(url)
}
