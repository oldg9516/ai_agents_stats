/**
 * Auto-Close Database Queries (Drizzle)
 *
 * Source: ai_agent_tasks — the ground-truth log of what the AI agent did.
 * An auto-closed ticket is a task of type 'send_prepared_answer' whose
 * `request` payload contains a `close_ticket` action plus an `add_tag`
 * action carrying the close reason (e.g. "order comment", "spam",
 * "auto-notification", "internal-alert").
 *
 * These tickets never get status = 'ZOHO draft created' and have no
 * action_analysis, so they are invisible to the main Automation Overview
 * pipeline. This query surfaces them grouped by tag.
 *
 * IMPORTANT: a true auto-close has NO send_reply and NO send_draft action.
 * A close_ticket that also contains send_reply is an auto-reply that happens
 * to close the ticket — it belongs to the auto-reply bucket, not here.
 *
 * One outcome per thread: if a thread has several close tasks (reruns),
 * only the latest is counted.
 */

import { sql } from 'drizzle-orm'
import { db } from './index'
import type { AutoCloseRecord, AutoCloseStats, AutoCloseTagStat } from './types'

export async function fetchAutoCloseStats(dateRange: {
	from: Date
	to: Date
}): Promise<AutoCloseStats> {
	// One row per thread (latest close task), with created_at + tag, so we can
	// both aggregate by tag and plot auto-closes over time.
	const result = await db.execute(sql`
		SELECT DISTINCT ON (thread_id)
			thread_id,
			ticket_id,
			created_at,
			COALESCE(NULLIF(substring(request from '"type":"add_tag","text":"([^"]+)"'), ''), 'untagged') AS tag
		FROM ai_agent_tasks
		WHERE type = 'send_prepared_answer'
			AND request LIKE '%"close_ticket"%'
			AND request NOT LIKE '%"send_reply"%'
			AND request NOT LIKE '%"send_draft"%'
			AND created_at >= ${dateRange.from}
			AND created_at < ${dateRange.to}
		ORDER BY thread_id, created_at DESC
	`)

	const rows = (result.rows ?? []) as {
		thread_id: string
		ticket_id: string | number | null
		created_at: string | Date | null
		tag: string
	}[]

	const records: AutoCloseRecord[] = rows.map((r) => ({
		thread_id: r.thread_id,
		ticket_id: r.ticket_id != null ? Number(r.ticket_id) : null,
		created_at:
			r.created_at instanceof Date
				? r.created_at.toISOString()
				: (r.created_at ?? ''),
		tag: r.tag,
	}))

	// Aggregate by tag (taskCount = one row per thread here, so tasks == threads)
	const tagMap = new Map<string, { taskCount: number; ticketIds: Set<number> }>()
	for (const rec of records) {
		let entry = tagMap.get(rec.tag)
		if (!entry) {
			entry = { taskCount: 0, ticketIds: new Set() }
			tagMap.set(rec.tag, entry)
		}
		entry.taskCount++
		if (rec.ticket_id != null) entry.ticketIds.add(rec.ticket_id)
	}

	const tags: AutoCloseTagStat[] = Array.from(tagMap.entries())
		.map(([tag, e]) => ({
			tag,
			taskCount: e.taskCount,
			ticketCount: e.ticketIds.size,
		}))
		.sort((a, b) => b.ticketCount - a.ticketCount || b.taskCount - a.taskCount)

	const allTicketIds = new Set<number>()
	for (const rec of records) {
		if (rec.ticket_id != null) allTicketIds.add(rec.ticket_id)
	}

	return {
		totalTasks: records.length,
		totalTickets: allTicketIds.size,
		tags,
		records,
	}
}
