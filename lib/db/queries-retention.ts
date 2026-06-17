/**
 * Retention Transparency Database Queries (Drizzle)
 *
 * Read-only trace of what the AI flow (Samantha) did with a retention ticket
 * and WHY, for the support team. Joins:
 *  - support_threads_data (std): pipeline state (classification, subscription
 *    info, action analysis, outstanding)
 *  - ai_agent_tasks: GROUND TRUTH outcome (send_reply / send_draft / close)
 *  - support_dialogs: incoming customer message, subject, email
 *  - ticket_transparency_comments: support-agent notes
 *
 * All JSON columns are TEXT and may be 'not_found' / invalid — parse defensively.
 */

import { sql, eq, desc, and, inArray } from 'drizzle-orm'
import { db } from './index'
import { ticketTransparencyComments, supportDialogs } from './schema'
import type {
	RetentionActionAnalysis,
	RetentionComment,
	RetentionFilters,
	RetentionListItem,
	RetentionOutcome,
	RetentionSubscriptionSummary,
	RetentionThreadTrace,
	RetentionTicketTrace,
} from './types'

/**
 * Which support direction a board covers, by request_type:
 *  - 'retention'    → request_type contains "retention"
 *  - 'subscription' → subscription support (request_type contains "subscription"
 *                     but NOT "retention"): shipping, payment, address change, etc.
 */
export type TransparencyDirection = 'retention' | 'subscription'

function directionCondition(direction: TransparencyDirection) {
	if (direction === 'subscription') {
		return sql`std.request_type ILIKE '%subscription%' AND std.request_type NOT ILIKE '%retention%'`
	}
	return sql`std.request_type ILIKE '%retention%'`
}

// ---------------------------------------------------------------------------
// Parse helpers (defensive — fields may be 'not_found' or invalid JSON)
// ---------------------------------------------------------------------------

function safeParse<T = unknown>(raw: string | null): T | null {
	if (!raw || raw === 'not_found' || raw === 'null') return null
	try {
		return JSON.parse(raw) as T
	} catch {
		return null
	}
}

function parseSubscription(raw: string | null): RetentionSubscriptionSummary | null {
	const data = safeParse<Record<string, unknown>>(raw)
	if (!data) return null

	const subs = (data.subscriptions as Record<string, unknown>[] | undefined) ?? []
	const first = subs[0] ?? null
	const details = (first?.details as Record<string, unknown> | undefined) ?? {}
	const chars =
		(first?.subscription_characteristics as Record<string, unknown> | undefined) ?? {}
	const payer = (first?.payer as Record<string, unknown> | undefined) ?? {}

	const str = (v: unknown): string | null =>
		v === undefined || v === null ? null : String(v)

	return {
		currentStatus: str(details.current_status),
		orderToken: str(details.order_token),
		customerNumber: str(details.customer_number),
		frequency: str(chars.frequency),
		regularBoxPrice:
			(chars.regular_box_price as number | string | undefined) ?? null,
		priceCurrency: str(chars.price_currency),
		paymentMethod: str(payer.payment_method ?? details.payment_method),
		boxName: str(details.box_name ?? chars.box_name),
	}
}

function parseActionAnalysis(raw: string | null): RetentionActionAnalysis | null {
	const data = safeParse<Record<string, unknown>>(raw)
	if (!data) return null
	const at = data.action_type
	return {
		requiresSystemAction:
			typeof data.requires_system_action === 'boolean'
				? data.requires_system_action
				: null,
		actionType: Array.isArray(at) ? at.map(String) : at ? [String(at)] : null,
		actionDetails: data.action_details ? String(data.action_details) : null,
		confidence: data.confidence ? String(data.confidence) : null,
		reasoning: data.reasoning ? String(data.reasoning) : null,
	}
}

function deriveOutcome(request: string | null): {
	outcome: RetentionOutcome
	tag: string | null
} {
	if (!request) return { outcome: 'unknown', tag: null }
	if (request.includes('"send_reply"')) return { outcome: 'auto_reply', tag: null }
	if (request.includes('"send_draft"')) return { outcome: 'draft', tag: null }
	if (request.includes('"close_ticket"')) {
		const m = request.match(/"type":"add_tag","text":"([^"]+)"/)
		return { outcome: 'auto_close', tag: m ? m[1] : null }
	}
	return { outcome: 'unknown', tag: null }
}

/**
 * Heuristic explanation of why a ticket ended up as a draft. Labeled in the UI
 * as a reconstruction — the exact reason may need the n8n log.
 */
function reconstructReason(
	t: Pick<
		RetentionThreadTrace,
		'isOutstanding' | 'outstandingTrigger' | 'requestType' | 'subscription' | 'actionAnalysis'
	>,
	fullRequest: string | null,
	hasSubscription: boolean,
): string | null {
	if (t.isOutstanding) {
		return `Outstanding${t.outstandingTrigger ? `: ${t.outstandingTrigger}` : ''}`
	}
	const status = t.subscription?.currentStatus
	const isRetention = (t.requestType ?? '').toLowerCase().includes('retention')
	if (status && ['Inactive', 'Pause', 'Paused'].includes(status) && isRetention) {
		return `Subscription not active (status: ${status}) — cannot auto-cancel`
	}
	if (t.actionAnalysis?.requiresSystemAction) {
		const at = t.actionAnalysis.actionType?.join(', ')
		return `Requires system action${at ? `: ${at}` : ''}`
	}
	if (fullRequest && /Order DB (ID|Token)/i.test(fullRequest)) {
		return 'Webhook ticket (backend sync required)'
	}
	if (isRetention && !hasSubscription) {
		return 'No subscription data found'
	}
	return null
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function fetchRetentionList(
	filters: RetentionFilters,
	pagination: { limit: number; offset: number },
	direction: TransparencyDirection = 'retention',
): Promise<RetentionListItem[]> {
	const { dateRange, searchQuery, outcomes, outstanding, subtypes } = filters

	const conds = [
		directionCondition(direction),
		sql`std.created_at >= ${dateRange.from}`,
		sql`std.created_at < ${dateRange.to}`,
	]

	if (outstanding === 'yes') conds.push(sql`std.is_outstanding IS TRUE`)
	else if (outstanding === 'no') conds.push(sql`std.is_outstanding IS NOT TRUE`)

	if (subtypes.length > 0) {
		conds.push(
			sql`std.request_subtype IN (${sql.join(
				subtypes.map((s) => sql`${s}`),
				sql`, `,
			)})`,
		)
	}

	if (searchQuery.trim()) {
		const q = `%${searchQuery.trim()}%`
		conds.push(
			sql`(std.ticket_id ILIKE ${q} OR std.thread_id ILIKE ${q} OR d.email ILIKE ${q} OR d.ticket_subject ILIKE ${q})`,
		)
	}

	if (outcomes.length > 0) {
		conds.push(
			sql`t.outcome IN (${sql.join(
				outcomes.map((o) => sql`${o}`),
				sql`, `,
			)})`,
		)
	}

	const whereClause = sql.join(conds, sql` AND `)

	// One row per ticket (latest thread), so multi-thread tickets aren't
	// duplicated; the modal then shows all threads newest-first.
	const result = await db.execute(sql`
		SELECT * FROM (
			SELECT DISTINCT ON (std.ticket_id)
				std.thread_id,
				std.ticket_id,
				std.created_at,
				std.request_subtype,
				std.request_sub_subtype,
				std.is_outstanding,
				std.outstanding_trigger,
				substring(std.subscription_info from '"current_status":"([^"]+)"') AS subscription_status,
				d.ticket_subject AS subject,
				d.email AS email,
				COALESCE(t.outcome, 'unknown') AS outcome,
				COALESCE(c.cnt, 0) AS comment_count
			FROM support_threads_data std
			LEFT JOIN LATERAL (
				SELECT CASE
					WHEN aat.request LIKE '%"send_reply"%' THEN 'auto_reply'
					WHEN aat.request LIKE '%"send_draft"%' THEN 'draft'
					WHEN aat.request LIKE '%"close_ticket"%' THEN 'auto_close'
					ELSE 'unknown' END AS outcome
				FROM ai_agent_tasks aat
				WHERE aat.type = 'send_prepared_answer' AND aat.thread_id = std.thread_id
				ORDER BY aat.created_at DESC LIMIT 1
			) t ON true
			LEFT JOIN LATERAL (
				SELECT ticket_subject, email FROM support_dialogs sd
				WHERE sd.thread_id = std.thread_id ORDER BY sd.date ASC LIMIT 1
			) d ON true
			LEFT JOIN LATERAL (
				SELECT COUNT(*)::int AS cnt FROM ticket_transparency_comments rc
				WHERE rc.ticket_id = std.ticket_id
			) c ON true
			WHERE ${whereClause}
			ORDER BY std.ticket_id, std.created_at DESC
		) sub
		ORDER BY created_at DESC
		LIMIT ${pagination.limit} OFFSET ${pagination.offset}
	`)

	const rows = (result.rows ?? []) as Record<string, unknown>[]
	return rows.map((r) => ({
		ticketId: String(r.ticket_id ?? ''),
		threadId: String(r.thread_id ?? ''),
		createdAt:
			r.created_at instanceof Date
				? r.created_at.toISOString()
				: String(r.created_at ?? ''),
		requestSubtype: (r.request_subtype as string | null) ?? null,
		requestSubSubtype: (r.request_sub_subtype as string | null) ?? null,
		isOutstanding: (r.is_outstanding as boolean | null) ?? null,
		outstandingTrigger: (r.outstanding_trigger as string | null) ?? null,
		subject: (r.subject as string | null) ?? null,
		email: (r.email as string | null) ?? null,
		subscriptionStatus: (r.subscription_status as string | null) ?? null,
		outcome: r.outcome as RetentionOutcome,
		commentCount: Number(r.comment_count ?? 0),
	}))
}

// ---------------------------------------------------------------------------
// Trace (single ticket, all threads)
// ---------------------------------------------------------------------------

export async function fetchRetentionTrace(
	ticketId: string,
): Promise<RetentionTicketTrace | null> {
	const stdRows = await db.execute(sql`
		SELECT thread_id, ticket_id, created_at, request_type, request_subtype,
			request_sub_subtype, requires_reply, requires_identification,
			requires_editing, requires_subscription_info, requires_tracking_info,
			requires_box_contents_info, requires_shop_order_info,
			subtype_override, subtype_override_reason,
			is_outstanding, outstanding_trigger,
			subscription_info, tracking_info, action_analysis, ai_draft_reply, full_request
		FROM support_threads_data
		WHERE ticket_id = ${ticketId}
		ORDER BY created_at DESC
	`)
	const threads = (stdRows.rows ?? []) as Record<string, unknown>[]
	if (threads.length === 0) return null

	const threadIds = threads.map((t) => String(t.thread_id))

	// Latest agent task per thread (ground-truth outcome)
	const taskRows = await db.execute(sql`
		SELECT DISTINCT ON (thread_id) thread_id, request, status, created_at
		FROM ai_agent_tasks
		WHERE type = 'send_prepared_answer' AND thread_id = ANY(${toPgArray(threadIds)}::text[])
		ORDER BY thread_id, created_at DESC
	`)
	const taskByThread = new Map<string, Record<string, unknown>>()
	for (const row of (taskRows.rows ?? []) as Record<string, unknown>[]) {
		taskByThread.set(String(row.thread_id), row)
	}

	// Incoming customer message + subject/email per thread (earliest inbound)
	const dialogRows = await db
		.select({
			threadId: supportDialogs.threadId,
			direction: supportDialogs.direction,
			text: supportDialogs.text,
			subject: supportDialogs.ticketSubject,
			email: supportDialogs.email,
			date: supportDialogs.date,
		})
		.from(supportDialogs)
		.where(inArray(supportDialogs.threadId, threadIds))
		.orderBy(supportDialogs.date)

	const inboundByThread = new Map<string, { text: string; subject: string | null; email: string | null }>()
	const anyByThread = new Map<string, { subject: string | null; email: string | null }>()
	for (const d of dialogRows) {
		const tid = d.threadId ?? ''
		if (!anyByThread.has(tid)) anyByThread.set(tid, { subject: d.subject ?? null, email: d.email ?? null })
		if (d.direction === 'in' && !inboundByThread.has(tid)) {
			inboundByThread.set(tid, { text: d.text ?? '', subject: d.subject ?? null, email: d.email ?? null })
		}
	}

	const bool = (v: unknown): boolean | null =>
		typeof v === 'boolean' ? v : null

	const traceThreads: RetentionThreadTrace[] = threads.map((t) => {
		const tid = String(t.thread_id)
		const subscription = parseSubscription((t.subscription_info as string) ?? null)
		const actionAnalysis = parseActionAnalysis((t.action_analysis as string) ?? null)
		const task = taskByThread.get(tid)
		const { outcome, tag } = deriveOutcome((task?.request as string) ?? null)
		const inbound = inboundByThread.get(tid)
		const fallbackMeta = anyByThread.get(tid)
		const requestType = (t.request_type as string | null) ?? null

		const base = {
			isOutstanding: bool(t.is_outstanding),
			outstandingTrigger: (t.outstanding_trigger as string | null) ?? null,
			requestType,
			subscription,
			actionAnalysis,
		}

		return {
			threadId: tid,
			createdAt:
				t.created_at instanceof Date
					? t.created_at.toISOString()
					: String(t.created_at ?? ''),
			requestType,
			requestSubtype: (t.request_subtype as string | null) ?? null,
			requestSubSubtype: (t.request_sub_subtype as string | null) ?? null,
			requiresReply: bool(t.requires_reply),
			requiresIdentification: bool(t.requires_identification),
			requiresEditing: bool(t.requires_editing),
			requiresSubscriptionInfo: bool(t.requires_subscription_info),
			requiresTrackingInfo: bool(t.requires_tracking_info),
			requiresBoxContentsInfo: bool(t.requires_box_contents_info),
			requiresShopOrderInfo: bool(t.requires_shop_order_info),
			subtypeOverride: bool(t.subtype_override),
			subtypeOverrideReason: (t.subtype_override_reason as string | null) ?? null,
			isOutstanding: bool(t.is_outstanding),
			outstandingTrigger: (t.outstanding_trigger as string | null) ?? null,
			subscription,
			subscriptionRaw:
				(t.subscription_info as string | null) &&
				(t.subscription_info as string) !== 'not_found'
					? (t.subscription_info as string)
					: null,
			trackingInfo:
				(t.tracking_info as string | null) &&
				(t.tracking_info as string) !== 'not_found'
					? (t.tracking_info as string)
					: null,
			actionAnalysis,
			aiDraftReply: (t.ai_draft_reply as string | null) ?? null,
			customerMessage: inbound?.text ?? null,
			subject: inbound?.subject ?? fallbackMeta?.subject ?? null,
			email: inbound?.email ?? fallbackMeta?.email ?? null,
			outcome,
			outcomeTag: tag,
			outcomeStatus: (task?.status as string | null) ?? null,
			outcomeAt:
				task?.created_at instanceof Date
					? (task.created_at as Date).toISOString()
					: (task?.created_at as string | null) ?? null,
			reason: reconstructReason(
				base,
				(t.full_request as string) ?? null,
				subscription !== null,
			),
		}
	})

	const comments = await fetchRetentionComments(ticketId)

	const firstWithMeta = traceThreads.find((t) => t.subject || t.email)
	return {
		ticketId,
		subject: firstWithMeta?.subject ?? null,
		email: firstWithMeta?.email ?? null,
		threads: traceThreads,
		comments,
	}
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function fetchRetentionComments(
	ticketId: string,
): Promise<RetentionComment[]> {
	const rows = await db
		.select()
		.from(ticketTransparencyComments)
		.where(eq(ticketTransparencyComments.ticketId, ticketId))
		.orderBy(desc(ticketTransparencyComments.createdAt))

	return rows.map((r) => ({
		id: r.id,
		ticketId: r.ticketId,
		threadId: r.threadId ?? null,
		author: r.author,
		comment: r.comment,
		createdAt: r.createdAt?.toISOString() ?? '',
	}))
}

export async function insertRetentionComment(input: {
	ticketId: string
	threadId: string | null
	author: string
	comment: string
}): Promise<void> {
	await db.insert(ticketTransparencyComments).values({
		ticketId: input.ticketId,
		threadId: input.threadId,
		author: input.author,
		comment: input.comment,
	})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Postgres text[] array literal (single param, avoids ROW limits). */
function toPgArray(ids: string[]): string {
	return (
		'{' +
		ids
			.map((id) => `"${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
			.join(',') +
		'}'
	)
}

/** Distinct request_subtype values for retention (for the filter dropdown). */
export async function fetchRetentionSubtypes(
	dateRange: { from: Date; to: Date },
	direction: TransparencyDirection = 'retention',
): Promise<string[]> {
	const result = await db.execute(sql`
		SELECT DISTINCT std.request_subtype FROM support_threads_data std
		WHERE ${directionCondition(direction)}
			AND std.request_subtype IS NOT NULL
			AND std.created_at >= ${dateRange.from} AND std.created_at < ${dateRange.to}
		ORDER BY std.request_subtype
	`)
	return (result.rows ?? [])
		.map((r) => (r as { request_subtype: string }).request_subtype)
		.filter(Boolean)
}
