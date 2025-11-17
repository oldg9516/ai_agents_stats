/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database Types
 *
 * TypeScript types for Supabase database schema
 * Based on ai_human_comparison table structure
 */

export interface Database {
	public: {
		Tables: {
			ai_human_comparison: {
				Row: AIHumanComparisonRow
				Insert: AIHumanComparisonInsert
				Update: AIHumanComparisonUpdate
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
					p_agents: string[] | null
					p_page: number
					p_page_size: number
				}
				Returns: Array<{
					category: string
					version: string
					dates: string | null
					sort_order: number
					total_records: number
					records_qualified_agents: number
					changed_records: number
					good_percentage: number
					total_count: number
				}>
			}
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
	comment: string | null
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
	recordsQualifiedAgents: number
	changedRecords: number
	goodPercentage: number
	// Change classification breakdown
	criticalErrors: number
	meaningfulImprovements: number
	stylisticPreferences: number
	noSignificantChanges: number
}

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
	agents: string[] // Must have at least 1
}

/**
 * Filter Options (for dropdowns)
 */
export interface FilterOptions {
	versions: string[]
	categories: string[]
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
	requirements: string[] // [] = all, else filter by active requirements
	versions: string[] // [] = all versions
}

/**
 * Request Category Statistics (for request categories page)
 */
export interface RequestCategoryStats {
	request_type: string
	request_subtype: string | null
	count: number
	percent: number
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
	version: string
	week: string // Week label (e.g., "Week 12")
	weekStart: string // ISO date
	agent: string // Email
	changed: boolean
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
