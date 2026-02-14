/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database Types
 *
 * TypeScript types for Supabase database schema
 * Based on ai_human_comparison table structure
 */

import type {
	LegacyClassificationType,
	NewClassificationType,
} from '@/constants/classification-types'

/**
 * Parsed action_analysis from support_threads_data (stored as JSON-stringified text)
 */
export interface ActionAnalysis {
	requires_system_action: boolean | null
	action_type: string[]
	action_details: string
	confidence: string // "high" | "medium" | "low"
	reasoning: string
	target_system: string | null // "Priority" | "PayPal" | "None" | custom
}

/**
 * Ticket Reviews table row (separate table for qualified agent feedback)
 */
export interface TicketReviewRow {
	id: number
	comparison_id: number
	review_status: 'processed' | 'unprocessed'
	ai_approved: boolean | null
	reviewer_name: string | null
	manual_comment: string | null
	requires_editing_correct: boolean | null
	action_analysis_verification: ActionAnalysisVerification | null
	created_at: string
	updated_at: string
}

/**
 * Verification data for action_analysis fields (stored as JSONB on ticket_reviews)
 */
export interface ActionAnalysisVerification {
	requires_system_action_correct: boolean
	corrected_action_types: string[] | null
	action_details_correct: boolean
	corrected_target_system: string[] | null // null = no correction, string[] = corrected values
	comment: string
}

export interface Database {
	public: {
		Tables: {
			ai_human_comparison: {
				Row: AIHumanComparisonRow
				Insert: AIHumanComparisonInsert
				Update: AIHumanComparisonUpdate
				Relationships: []
			}
			ticket_reviews: {
				Row: TicketReviewRow
				Insert: {
					id?: number
					comparison_id: number
					review_status?: 'processed' | 'unprocessed'
					ai_approved?: boolean | null
					reviewer_name?: string | null
					manual_comment?: string | null
					requires_editing_correct?: boolean | null
					action_analysis_verification?: ActionAnalysisVerification | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: number
					comparison_id?: number
					review_status?: 'processed' | 'unprocessed'
					ai_approved?: boolean | null
					reviewer_name?: string | null
					manual_comment?: string | null
					requires_editing_correct?: boolean | null
					action_analysis_verification?: ActionAnalysisVerification | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
		}
		Views: {
			ai_comparison_with_reviews: {
				Row: AIHumanComparisonRow & {
					review_status: string | null
					ai_approved: boolean | null
					reviewer_name: string | null
					manual_comment: string | null
					requires_editing_correct: boolean | null
					action_analysis_verification: any | null
				}
				Relationships: []
			}
		}
		Functions: {
			get_min_created_date: {
				Args: Record<string, never>
				Returns: string
			}
			get_filter_options: {
				Args: {
					p_from_date: string | null
					p_to_date: string | null
				}
				Returns: Array<{
					versions: string[] | null
					categories: string[] | null
				}>
			}
			get_detailed_stats_paginated: {
				Args: {
					p_from_date: string
					p_to_date: string
					p_versions: string[] | null
					p_categories: string[] | null
					p_page: number
					p_page_size: number
				}
				Returns: Array<{
					category: string
					version: string
					dates: string | null
					sort_order: number
					total_records: number
					changed_records: number
					good_percentage: number
					total_count: number
				}>
			}
			get_kpi_stats: {
				Args: {
					p_from_date: string
					p_to_date: string
					p_versions?: string[] | null
					p_categories?: string[] | null
					p_agents?: string[] | null
					p_date_field?: string
				}
				Returns: Array<{
					total_records: number
					reviewed_records: number
					context_shift_records: number
					quality_records: number
					changed_records: number
				}>
			}
			get_best_category: {
				Args: {
					p_from_date: string
					p_to_date: string
					p_versions?: string[] | null
					p_categories?: string[] | null
					p_agents?: string[] | null
					p_date_field?: string
				}
				Returns: Array<{
					category: string
					total_evaluable: number
					quality_records: number
					quality_percentage: number
				}>
			}
			get_support_status_distribution: {
				Args: {
					p_date_from: string
					p_date_to: string
					p_statuses?: string[] | null
					p_request_types?: string[] | null
					p_categories?: string[] | null
					p_requirements?: string[] | null
					p_versions?: string[] | null
				}
				Returns: Array<{
					status: string
					count: number
					percentage: number
				}>
			}
			get_support_resolution_time: {
				Args: {
					p_date_from: string
					p_date_to: string
				}
				Returns: Array<{
					week_start: string
					avg_resolution_time: number
					thread_count: number
				}>
			}
			get_support_sankey_data: {
				Args: {
					p_date_from: string
					p_date_to: string
					p_statuses?: string[] | null
					p_request_types?: string[] | null
					p_categories?: string[] | null
					p_requirements?: string[] | null
					p_versions?: string[] | null
				}
				Returns: Array<{
					created: number
					used_as_is: number
					edited: number
					rejected: number
					resolved: number
					pending: number
				}>
			}
			get_support_correlation_matrix: {
				Args: {
					p_date_from: string
					p_date_to: string
					p_statuses?: string[] | null
					p_request_types?: string[] | null
					p_categories?: string[] | null
					p_versions?: string[] | null
				}
				Returns: Array<{
					x: string
					y: string
					value: number
				}>
			}
			get_support_kpis: {
				Args: {
					p_date_from: string
					p_date_to: string
					p_prev_date_from: string
					p_statuses?: string[] | null
					p_request_types?: string[] | null
					p_categories?: string[] | null
					p_requirements?: string[] | null
					p_versions?: string[] | null
				}
				Returns: Array<{
					current_total: number
					current_requires_reply: number
					current_resolved: number
					current_requirements_sum: number
					current_agent_response_count: number
					previous_total: number
					previous_requires_reply: number
					previous_resolved: number
					previous_requirements_sum: number
					previous_agent_response_count: number
				}>
			}
			get_subcategories_stats: {
				Args: {
					p_date_from: string
					p_date_to: string
					p_qualified_agents: string[]
					p_versions?: string[] | null
					p_agents?: string[] | null
				}
				Returns: Array<{
					category: string
					subcategory: string
					total: number
					changed: number
					unchanged: number
					quality_percentage: number
					critical_error: number
					meaningful_improvement: number
					stylistic_preference: number
					no_significant_change: number
					context_shift: number
				}>
			}
		}
		Enums: {
			[_ in never]: never
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

/**
 * AI Human Comparison table row
 */
export interface AIHumanComparisonRow {
	id: number
	created_at: string | null // ISO timestamp
	status: string | null
	thread_id: string | null // Link to support_threads_data
	full_request: string | null
	subscription_info: any | null // jsonb
	tracking_info: any | null // jsonb
	human_reply: string | null // Human agent's final response text
	ai_reply: string | null
	ai_reply_date: string | null
	human_reply_date: string | null
	comment: string | null // AI-generated comment
	manual_comment: string | null // Manual reviewer comment
	request_subtype: string | null // Category
	email: string | null // Agent email
	changes: any | null // jsonb
	updated_at: string | null
	ticket_id: string | null
	human_reply_original: string | null
	check_count: number | null
	changed: boolean | null // Whether human edited AI output
	last_checked_at: string | null
	improvement_suggestions: any | null // jsonb
	similarity_score: number | null
	prompt_version: string | null // Version (v1, v2, v3, etc.)
	change_classification:
		| LegacyClassificationType
		| NewClassificationType
		| null // Classification of changes (legacy or new format)
}

/**
 * Insert type (for creating new records)
 */
export interface AIHumanComparisonInsert {
	id?: number
	request_subtype: string
	prompt_version: string
	created_at?: string
	email: string
	changed: boolean
	human_reply?: string
}

/**
 * Update type (for updating existing records)
 */
export interface AIHumanComparisonUpdate {
	id?: number
	request_subtype?: string
	prompt_version?: string
	created_at?: string
	email?: string
	changed?: boolean
	human_reply?: string
}

/**
 * KPI Data structure
 */
export interface KPIData {
	totalRecords: {
		current: number
		previous: number
		trend: TrendData
	}
	averageQuality: {
		current: number
		previous: number
		trend: TrendData
	}
	bestCategory: {
		category: string
		percentage: number
		previousPercentage: number
		trend: TrendData
	}
	recordsChanged: {
		current: number
		previous: number
		trend: TrendData
	}
}

/**
 * Trend data structure
 */
export interface TrendData {
	value: number // Absolute change
	percentage: number // Percentage change
	direction: 'up' | 'down' | 'neutral'
}

/**
 * Quality Trends data (for main line chart)
 */
export interface QualityTrendData {
	category: string
	weekStart: string // ISO date
	goodPercentage: number
}

/**
 * Category Distribution data (for pie chart)
 */
export interface CategoryDistributionData {
	category: string
	totalRecords: number
	goodPercentage: number
}

/**
 * Category Distribution result with total count
 */
export interface CategoryDistributionResult {
	categories: CategoryDistributionData[]
	totalCount: number // Total records count from query (not sum of categories)
}

/**
 * Version Comparison data (for bar chart)
 */
export interface VersionComparisonData {
	version: string
	goodPercentage: number
	totalRecords: number
}

/**
 * Detailed Stats table row
 */
export interface DetailedStatsRow {
	category: string
	version: string
	dates: string | null // Week range or null for version-level rows
	sortOrder: number // 1 for version-level, 2 for week-level
	totalRecords: number
	reviewedRecords: number // Records with classification (not null)
	aiErrors: number // Only critical_error + meaningful_improvement (legacy) or score < 90 (new)
	aiQuality: number // Only no_significant_change + stylistic_preference (legacy) or score >= 90 (new)
	// Legacy classification breakdown (v3.x)
	criticalErrors: number
	meaningfulImprovements: number
	stylisticPreferences: number
	noSignificantChanges: number
	contextShifts: number // Context shift cases (excluded from quality calculations)
	// New classification breakdown (v4.0)
	criticalFactErrors: number
	majorFunctionalOmissions: number
	minorInfoGaps: number
	confusingVerbosity: number
	tonalMisalignments: number
	structuralFixes: number
	stylisticEdits: number
	perfectMatches: number
	exclWorkflowShifts: number
	exclDataDiscrepancies: number
	humanIncomplete: number // HUMAN_INCOMPLETE - human reply was incomplete (excluded)
	// New scoring (v4.0)
	averageScore: number | null // Average quality score (0-100) for new system
	// AI Approved override
	aiApprovedCount: number // Records manually marked as ai_approved = true (excluded from classification groups)
	// Unclassified records (null, empty, or unknown classification)
	unclassifiedCount: number // Records with null/empty/unknown change_classification
	// Response status fields
	notResponded: number // Records with human_reply IS NULL (agent didn't respond)
	secondRequest: number // Records with repeated customer message before agent response
}

/**
 * Scoring mode for quality calculation
 */
export type ScoringMode = 'legacy' | 'new'

/**
 * Category display mode for table
 * - 'all': Show all categories as-is (including multi-categories with commas)
 * - 'merged': Merge all multi-categories (containing commas) into single "Multi-category" group
 */
export type CategoryDisplayMode = 'all' | 'merged'

/**
 * Date filter mode for dashboard
 * - 'created': Filter by created_at (when AI generated the response)
 * - 'human_reply': Filter by human_reply_date (when agent responded)
 */
export type DateFilterMode = 'created' | 'human_reply'

/**
 * Dashboard Filters
 */
export interface DashboardFilters {
	dateRange: {
		from: Date
		to: Date
	}
	versions: string[] // [] = all versions
	categories: string[] // [] = all categories
	agents: string[] // [] = all agents (filter by email)
	hideRequiresEditing?: boolean // DEPRECATED: use showNeedEdit/showNotNeedEdit instead
	showNeedEdit?: boolean // true = show records where requires_editing = true (default: true)
	showNotNeedEdit?: boolean // true = show records where requires_editing = false (default: true)
}

/**
 * Filter Options (for dropdowns)
 */
export interface FilterOptions {
	versions: string[]
	categories: string[]
	agents: string[]
}

/**
 * Pagination state
 */
export interface PaginationState {
	pageIndex: number
	pageSize: number
}

/**
 * Sort state
 */
export interface SortState {
	column: string
	direction: 'asc' | 'desc'
}

// ============================================================================
// Support Overview Types
// ============================================================================

/**
 * Support Threads Data table row
 */
export interface SupportThreadRow {
	thread_id: string
	ticket_id: string
	request_type: string | null
	request_subtype: string | null
	requires_reply: boolean
	requires_identification: boolean
	requires_editing: boolean
	requires_subscription_info: boolean
	requires_tracking_info: boolean
	ai_draft_reply: string | null
	status: string
	prompt_version: string | null
	created_at: string | null
}

/**
 * Combined Support Thread (JOIN with ai_human_comparison and support_dialogs)
 */
export interface SupportThread extends SupportThreadRow {
	// Fields from ai_human_comparison (via JOIN)
	changed: boolean | null
	email: string | null
	human_reply: string | null // Human agent's final response text
	qualityPercentage: number | null // Calculated quality for this thread
	// Fields from support_dialogs (via JOIN)
	direction: string | null // Thread direction (incoming/outgoing)
	customer_request_text: string | null // Customer's request text from support_dialogs.text
	// Fields from support_threads_data.user JSON
	customer_email: string | null // Customer email parsed from user JSON field
	// Computed field: true if there's an outgoing message in support_dialogs AFTER this AI thread
	hasHumanResponseAfterAI?: boolean
}

/**
 * Support Overview KPIs
 */
export interface SupportKPIs {
	agentResponseRate: {
		current: number // % of threads reviewed by qualified agents
		previous: number
		trend: TrendData
	}
	replyRequired: {
		current: number // % of threads that require reply
		previous: number
		trend: TrendData
	}
	dataCollectionRate: {
		current: number // % of resolved threads
		previous: number
		trend: TrendData
	}
	avgRequirements: {
		current: number // Average number of requirements per thread
		previous: number
		trend: TrendData
	}
}

/**
 * Status Distribution data (for pie chart)
 */
export interface StatusDistribution {
	status: string
	count: number
	percentage: number
}

/**
 * Resolution Time data (for bar chart)
 */
export interface ResolutionTimeData {
	weekStart: string // ISO date
	avgResolutionTime: number // Average hours to resolution
	threadCount: number
}

/**
 * Sankey diagram node
 */
export interface SankeyNode {
	id: string
	label: string
}

/**
 * Sankey diagram link
 */
export interface SankeyLink {
	source: string
	target: string
	value: number
}

/**
 * Sankey diagram data structure
 */
export interface SankeyData {
	nodes: SankeyNode[]
	links: SankeyLink[]
}

/**
 * Correlation matrix cell
 */
export interface CorrelationCell {
	x: string // Requirement type
	y: string // Requirement type
	value: number // Correlation coefficient (0-1)
}

/**
 * Support Overview Filters
 */
export interface SupportFilters {
	dateRange: {
		from: Date
		to: Date
	}
	statuses: string[] // [] = all statuses
	requestTypes: string[] // [] = all request types
	categories: string[] // [] = all categories (request_subtype)
	requirements: string[] // [] = all, else filter by active requirements
	versions: string[] // [] = all versions
	pendingDraftsOnly: boolean // true = show only threads with AI draft but no agent response
	hideRequiresEditing: boolean // true = hide threads where requires_editing = true
}

/**
 * Request Category Statistics (for request categories page)
 */
export interface RequestCategoryStats {
	request_type: string
	request_subtype: string | null
	count: number
	percent: number
	compared_count: number // Count of records with status = 'compared' from ai_human_comparison
	avg_response_time: number // Average response time in hours (from created_at to human_reply_date)
	p90_response_time: number // 90th percentile response time in hours
}

// ============================================================================
// Category Detail Types
// ============================================================================

/**
 * Category Detail Filters
 */
export interface CategoryFilters {
	dateRange: {
		from: Date
		to: Date
	}
	versions: string[] // [] = all versions
	agents: string[] // [] = all qualified agents
}

/**
 * Category KPI Data (with trends)
 */
export interface CategoryKPIData {
	totalRecords: {
		current: number
		previous: number
		trend: TrendData
	}
	quality: {
		current: number // Percentage
		previous: number
		trend: TrendData
	}
	changed: {
		current: number // Count of changed records
		previous: number
		trend: TrendData
	}
}

/**
 * Category Weekly Trend (for line chart)
 */
export interface CategoryWeeklyTrend {
	weekStart: string // ISO date
	weekEnd: string // ISO date
	totalRecords: number
	goodRecords: number
	goodPercentage: number
	changedRecords: number
}

/**
 * Category Version Stats (breakdown by prompt version)
 */
export interface CategoryVersionStats {
	version: string
	totalRecords: number
	goodRecords: number
	goodPercentage: number
	changedRecords: number
}

/**
 * Category Agent Stats (breakdown by qualified agent)
 */
export interface CategoryAgentStats {
	agent: string // Email
	totalRecords: number
	goodRecords: number
	goodPercentage: number
	changedRecords: number
}

/**
 * Category Record (individual record for table)
 */
export interface CategoryRecord {
	id: number
	ticketId: string | null // Zoho ticket ID for direct link
	version: string
	week: string // Week label (e.g., "Week 12")
	weekStart: string // ISO date
	agent: string // Email
	changed: boolean
	changeClassification: string | null // Classification type from ai_human_comparison
	createdAt: string // ISO timestamp
}

/**
 * Category Detail Data (complete data for category detail page)
 */
export interface CategoryDetailData {
	categoryName: string
	kpis: CategoryKPIData
	weeklyTrends: CategoryWeeklyTrend[]
	versionStats: CategoryVersionStats[]
	agentStats: CategoryAgentStats[]
	records: {
		data: CategoryRecord[]
		total: number // Total count for pagination
	}
}

// ============================================================================
// Tickets Review Types
// ============================================================================

/**
 * Tickets Review Record (combined from ai_human_comparison + support_threads_data + support_dialogs)
 */
export interface TicketReviewRecord extends AIHumanComparisonRow {
	// Review fields (from ticket_reviews table)
	review_status: 'processed' | 'unprocessed' | null
	ai_approved: boolean | null
	reviewer_name: string | null
	manual_comment: string | null
	requires_editing_correct: boolean | null
	action_analysis_verification: ActionAnalysisVerification | null
	// Fields from support_threads_data (via JOIN on thread_id)
	user: string | null // Customer email from support_threads_data.user JSON
	request_sub_subtype: string | null // Sub-subcategory from support_threads_data
	requires_editing: boolean | null // Whether AI determined additional actions needed (from support_threads_data)
	action_analysis: ActionAnalysis | null // Parsed action_analysis JSON from support_threads_data
	// Field from support_dialogs (via JOIN on thread_id, direction='incoming')
	customer_request_text: string | null // Customer's request text from support_dialogs
}

/**
 * Tickets Review Filters
 */
export interface TicketsReviewFilters {
	dateRange: {
		from: Date
		to: Date
	}
	ticketId: number | null // ai_human_comparison.id - null = no filter
	searchQuery: string // server-side text search across multiple fields
	categories: string[] // request_subtype - [] = all
	versions: string[] // prompt_version - [] = all
	classifications: string[] // change_classification - [] = all
	agents: string[] // email - [] = all agents
	reviewStatuses: string[] // review_status - [] = all (processed/unprocessed)
	reviewerNames: string[] // reviewer_name - [] = all reviewers
}

// ============================================================================
// Action Analysis Quality Types
// ============================================================================

/**
 * Action Analysis Quality page filters
 */
export interface ActionAnalysisFilters {
	dateRange: {
		from: Date
		to: Date
	}
	categories: string[] // request_subtype - [] = all
	versions: string[] // prompt_version - [] = all
	agents: string[] // email - [] = all agents
}

/**
 * Enriched record with both AI determination and agent verification
 */
export interface ActionAnalysisRecord {
	id: number
	created_at: string
	request_subtype: string | null
	request_sub_subtype: string | null
	email: string | null
	prompt_version: string | null
	action_analysis: ActionAnalysis | null
	verification: ActionAnalysisVerification | null
}

/**
 * Aggregated stats for the Action Analysis Quality page
 */
export interface ActionAnalysisStats {
	totalRecords: number // All records with action_analysis
	totalVerified: number // Records with both action_analysis and verification
	requiresActionCorrect: number
	requiresActionIncorrect: number
	requiresActionAccuracy: number
	actionTypeCorrect: number
	actionTypeIncorrect: number
	actionTypeAccuracy: number
	categoryBreakdown: CategoryActionStats[]
	actionTypeDistribution: ActionTypeDistItem[]
}

/**
 * Per-category accuracy stats with automation potential
 */
export interface CategoryActionStats {
	category: string
	totalRecords: number // All records with action_analysis
	totalVerified: number // Records with verification
	requiresActionAccuracy: number
	actionTypeAccuracy: number
	automationScore: number
	subSubCategoryBreakdown: SubSubCategoryStats[]
}

/**
 * Per-sub-subcategory accuracy stats
 */
export interface SubSubCategoryStats {
	subSubCategory: string
	totalRecords: number
	totalVerified: number
	requiresActionAccuracy: number
	actionTypeAccuracy: number
}

/**
 * Action type distribution: AI prediction vs agent verification
 */
export interface ActionTypeDistItem {
	actionType: string
	aiCount: number
	verifiedCorrect: number
	verifiedIncorrect: number
}

// ============================================================================
// Backlog Reports Types
// ============================================================================

/**
 * Category statistics mapping (category name -> ticket count)
 */
export interface CategoryStats {
	[category: string]: number
}

/**
 * Weekly statistics breakdown
 */
export interface WeeklyStats {
	week: string // Week identifier (e.g., "Dec 2-8")
	total: number
	[category: string]: number | string // Dynamic category columns
}

/**
 * Main pattern identified in the backlog
 */
export interface MainPattern {
	rank: number
	pattern_name: string
	description: string
	volume: number
	examples: string[]
	business_insight: string
}

/**
 * Temporal trend observation
 */
export interface TemporalTrend {
	observation: string
	timeframe: string
	possible_cause: string
}

/**
 * Specific issue identified in the backlog
 */
export interface SpecificIssue {
	issue: string
	details: string
	affected_period: string
}

/**
 * Backlog Report - AI-generated analysis of support tickets
 */
export interface BacklogReport {
	id: string
	created_at: string
	period_days: number
	date_from: string
	date_to: string
	total_tickets: number
	stats: CategoryStats
	weekly_stats: WeeklyStats[]
	executive_summary: string
	main_patterns: MainPattern[]
	temporal_trends: TemporalTrend[]
	specific_issues: SpecificIssue[]
	recommendations: string[]
}

/**
 * Backlog Reports Filters
 */
export interface BacklogReportsFilters {
	dateRange: {
		from: Date
		to: Date
	}
	periodDays: number | null // 7, 14, 30 or null for all
	minTickets: number | null
	searchQuery: string
}

// ============================================================================
// Agent Statistics Types
// ============================================================================

/**
 * Agent Statistics Row - shows how efficiently an agent uses AI drafts
 */
export interface AgentStatsRow {
	email: string
	answeredTickets: number // human_reply IS NOT NULL
	aiReviewed: number // change_classification IS NOT NULL
	changed: number // changed = true AND change_classification IS NOT NULL
	criticalErrors: number // AI errors that needed fixing (AI_ERROR_CLASSIFICATIONS)
	unnecessaryChangesPercent: number // (changed - criticalErrors) / aiReviewed * 100
	aiEfficiency: number // 100 - unnecessaryChangesPercent
}

/**
 * Agent Statistics Filters
 */
export interface AgentStatsFilters {
	dateRange: {
		from: Date
		to: Date
	}
	versions: string[] // [] = all versions
	categories: string[] // [] = all categories
}

/**
 * Agent Change Type for modal filtering
 * - 'all': All changes (changed=true)
 * - 'critical': Only critical changes (real AI errors)
 * - 'unnecessary': Only unnecessary changes (AI was correct)
 */
export type AgentChangeType = 'all' | 'critical' | 'unnecessary'

/**
 * Agent Change Ticket - ticket data for modal display
 */
export interface AgentChangeTicket {
	id: number
	ticket_id: string | null
	email: string
	change_classification: string | null
	created_at: string
	request_subtype: string | null
	prompt_version: string | null
}

/**
 * Agent Changes Modal State
 */
export interface AgentChangesModalState {
	isOpen: boolean
	agentEmail: string | null
	changeType: AgentChangeType
}
