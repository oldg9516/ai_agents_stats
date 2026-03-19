import {
	boolean,
	integer,
	jsonb,
	pgTable,
	pgView,
	real,
	serial,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const aiHumanComparison = pgTable('ai_human_comparison', {
	id: serial('id').primaryKey(),
	createdAt: timestamp('created_at', { withTimezone: true }),
	status: text('status'),
	threadId: text('thread_id'),
	fullRequest: text('full_request'),
	subscriptionInfo: jsonb('subscription_info'),
	trackingInfo: jsonb('tracking_info'),
	humanReply: text('human_reply'),
	aiReply: text('ai_reply'),
	aiReplyDate: timestamp('ai_reply_date'),
	humanReplyDate: timestamp('human_reply_date'),
	comment: text('comment'),
	manualComment: text('manual_comment'),
	requestSubtype: text('request_subtype'),
	email: text('email'),
	changes: jsonb('changes'),
	updatedAt: timestamp('updated_at'),
	ticketId: text('ticket_id'),
	humanReplyOriginal: text('human_reply_original'),
	checkCount: integer('check_count'),
	changed: boolean('changed'),
	lastCheckedAt: timestamp('last_checked_at'),
	improvementSuggestions: jsonb('improvement_suggestions'),
	similarityScore: real('similarity_score'),
	promptVersion: text('prompt_version'),
	changeClassification: text('change_classification'),
})

export const ticketReviews = pgTable('ticket_reviews', {
	id: serial('id').primaryKey(),
	comparisonId: integer('comparison_id')
		.unique()
		.references(() => aiHumanComparison.id),
	reviewStatus: text('review_status').default('unprocessed'),
	aiApproved: boolean('ai_approved'),
	reviewerName: text('reviewer_name'),
	manualComment: text('manual_comment'),
	requiresEditingCorrect: boolean('requires_editing_correct'),
	actionAnalysisVerification: jsonb('action_analysis_verification'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
})

export const supportThreadsData = pgTable('support_threads_data', {
	threadId: text('thread_id').primaryKey(),
	ticketId: text('ticket_id'),
	requestType: text('request_type'),
	requestSubtype: text('request_subtype'),
	requestSubSubtype: text('request_sub_subtype'),
	requiresReply: boolean('requires_reply'),
	requiresIdentification: boolean('requires_identification'),
	requiresEditing: boolean('requires_editing'),
	requiresSubscriptionInfo: boolean('requires_subscription_info'),
	requiresTrackingInfo: boolean('requires_tracking_info'),
	requiresBoxContentsInfo: boolean('requires_box_contents_info'),
	aiDraftReply: text('ai_draft_reply'),
	status: text('status'),
	promptVersion: text('prompt_version'),
	createdAt: timestamp('created_at'),
	user: text('user'),
	actionAnalysis: text('action_analysis'),
	isOutstanding: boolean('is_outstanding'),
})

export const supportDialogs = pgTable('support_dialogs', {
	id: serial('id').primaryKey(),
	threadId: text('thread_id'),
	ticketId: text('ticket_id'),
	direction: text('direction'),
	text: text('text'),
	date: timestamp('date'),
})

export const backlogReports = pgTable('backlog_reports', {
	id: uuid('id').primaryKey().defaultRandom(),
	createdAt: timestamp('created_at').defaultNow(),
	periodDays: integer('period_days'),
	dateFrom: text('date_from'),
	dateTo: text('date_to'),
	totalTickets: integer('total_tickets'),
	stats: jsonb('stats'),
	weeklyStats: jsonb('weekly_stats'),
	executiveSummary: text('executive_summary'),
	mainPatterns: jsonb('main_patterns'),
	temporalTrends: jsonb('temporal_trends'),
	specificIssues: jsonb('specific_issues'),
	recommendations: jsonb('recommendations'),
})

export const evalResults = pgTable('eval_results', {
	id: serial('id').primaryKey(),
	requestSubtype: text('request_subtype'),
	requestSubSubtype: text('request_sub_subtype'),
	createdAt: timestamp('created_at'),
	decision: text('decision'),
	autoSendEnabled: boolean('auto_send_enabled'),
	checks: jsonb('checks'),
	diagnostics: jsonb('diagnostics'),
	overrides: jsonb('overrides'),
})

export const dashboardChatSessions = pgTable('dashboard_chat_sessions', {
	id: uuid('id').primaryKey().defaultRandom(),
	visitorId: text('visitor_id').notNull(),
	title: text('title'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
	metadata: jsonb('metadata').default({}),
	isArchived: boolean('is_archived').default(false),
})

export const dashboardChatMessages = pgTable('dashboard_chat_messages', {
	id: uuid('id').primaryKey().defaultRandom(),
	sessionId: uuid('session_id')
		.notNull()
		.references(() => dashboardChatSessions.id),
	messageId: text('message_id'),
	role: text('role').notNull(),
	content: text('content'),
	contentType: text('content_type').default('text'),
	metadata: jsonb('metadata').default({}),
	agentName: text('agent_name'),
	parentMessageId: text('parent_message_id'),
	status: text('status'),
	createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/**
 * Existing database view: LEFT JOIN of ai_human_comparison with ticket_reviews.
 * Using `.existing()` since the view is already defined in the database —
 * Drizzle won't try to create/alter it, just uses it for type-safe queries.
 */
export const aiComparisonWithReviews = pgView('ai_comparison_with_reviews', {
	// ai_human_comparison columns
	id: serial('id'),
	createdAt: timestamp('created_at', { withTimezone: true }),
	status: text('status'),
	threadId: text('thread_id'),
	fullRequest: text('full_request'),
	subscriptionInfo: jsonb('subscription_info'),
	trackingInfo: jsonb('tracking_info'),
	humanReply: text('human_reply'),
	aiReply: text('ai_reply'),
	aiReplyDate: timestamp('ai_reply_date'),
	humanReplyDate: timestamp('human_reply_date'),
	comment: text('comment'),
	manualComment: text('manual_comment'),
	requestSubtype: text('request_subtype'),
	email: text('email'),
	changes: jsonb('changes'),
	updatedAt: timestamp('updated_at'),
	ticketId: text('ticket_id'),
	humanReplyOriginal: text('human_reply_original'),
	checkCount: integer('check_count'),
	changed: boolean('changed'),
	lastCheckedAt: timestamp('last_checked_at'),
	improvementSuggestions: jsonb('improvement_suggestions'),
	similarityScore: real('similarity_score'),
	promptVersion: text('prompt_version'),
	changeClassification: text('change_classification'),
	// ticket_reviews columns
	reviewStatus: text('review_status'),
	aiApproved: boolean('ai_approved'),
	reviewerName: text('reviewer_name'),
	trManualComment: text('tr_manual_comment'),
	requiresEditingCorrect: boolean('requires_editing_correct'),
	actionAnalysisVerification: jsonb('action_analysis_verification'),
}).existing()
