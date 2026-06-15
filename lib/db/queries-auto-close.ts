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
import type { AutoCloseStats, AutoCloseTagStat } from './types'

export async function fetchAutoCloseStats(dateRange: {
	from: Date
	to: Date
}): Promise<AutoCloseStats> {
	const result = await db.execute(sql`
		WITH close_tasks AS (
			SELECT DISTINCT ON (thread_id)
				thread_id,
				ticket_id,
				substring(request from '"type":"add_tag","text":"([^"]+)"') AS tag
			FROM ai_agent_tasks
			WHERE type = 'send_prepared_answer'
				AND request LIKE '%"close_ticket"%'
				AND request NOT LIKE '%"send_reply"%'
				AND request NOT LIKE '%"send_draft"%'
				AND created_at >= ${dateRange.from}
				AND created_at < ${dateRange.to}
			ORDER BY thread_id, created_at DESC
		)
		SELECT
			COALESCE(NULLIF(tag, ''), 'untagged') AS tag,
			COUNT(*)::int AS task_count,
			COUNT(DISTINCT ticket_id)::int AS ticket_count
		FROM close_tasks
		GROUP BY 1
		ORDER BY ticket_count DESC, task_count DESC
	`)

	const rows = (result.rows ?? []) as {
		tag: string
		task_count: number
		ticket_count: number
	}[]

	const tags: AutoCloseTagStat[] = rows.map((r) => ({
		tag: r.tag,
		taskCount: r.task_count,
		ticketCount: r.ticket_count,
	}))

	return {
		totalTasks: tags.reduce((sum, t) => sum + t.taskCount, 0),
		totalTickets: tags.reduce((sum, t) => sum + t.ticketCount, 0),
		tags,
	}
}
