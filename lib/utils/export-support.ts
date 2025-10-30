/**
 * Support Overview CSV Export Utility
 *
 * Export support threads data to CSV format
 */

import type { SupportThread } from '../supabase/types'
import { getStatusLabel } from '@/constants/support-statuses'
import { getRequestTypeLabel } from '@/constants/request-types'
import { getActiveRequirements } from '@/constants/requirement-types'
import { format } from 'date-fns'

/**
 * Convert support threads data to CSV format
 */
export function convertSupportThreadsToCSV(threads: SupportThread[]): string {
	// CSV Headers
	const headers = [
		'Thread ID',
		'Ticket ID',
		'Request Type',
		'Category',
		'Status',
		'Requirements',
		'Has AI Draft',
		'Quality %',
		'Agent Email',
		'Prompt Version',
		'Created At',
	]

	// Build CSV rows
	const rows = threads.map((thread) => {
		const requirements = getActiveRequirements(
			thread as unknown as Record<string, boolean>
		).join(', ')
		const hasAIDraft = thread.ai_draft_reply ? 'Yes' : 'No'
		const quality =
			thread.qualityPercentage !== null
				? `${thread.qualityPercentage.toFixed(1)}%`
				: 'N/A'
		const createdAt = thread.created_at
			? format(new Date(thread.created_at), 'yyyy-MM-dd HH:mm')
			: 'N/A'

		return [
			thread.thread_id,
			thread.ticket_id,
			getRequestTypeLabel(thread.request_type),
			thread.request_subtype || 'N/A',
			getStatusLabel(thread.status),
			requirements || 'None',
			hasAIDraft,
			quality,
			thread.email || 'N/A',
			thread.prompt_version || 'N/A',
			createdAt,
		]
	})

	// Combine headers and rows
	const csvContent = [
		headers.join(','),
		...rows.map((row) =>
			row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
		),
	].join('\n')

	return csvContent
}

/**
 * Download CSV file
 */
export function downloadSupportThreadsCSV(
	threads: SupportThread[],
	filename: string = 'support-threads-export.csv'
) {
	const csv = convertSupportThreadsToCSV(threads)
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
	const link = document.createElement('a')

	if (link.download !== undefined) {
		const url = URL.createObjectURL(blob)
		link.setAttribute('href', url)
		link.setAttribute('download', filename)
		link.style.visibility = 'hidden'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}
}
