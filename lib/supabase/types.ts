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
  }
}

/**
 * AI Human Comparison table row
 */
export interface AIHumanComparisonRow {
  id: number
  request_subtype: string | null // Category
  prompt_version: string | null // Version (v1, v2, v3, etc.)
  created_at: string | null // ISO timestamp
  email: string | null // Agent email
  changed: boolean | null // Whether human edited AI output
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
 * Combined Support Thread (JOIN with ai_human_comparison)
 */
export interface SupportThread extends SupportThreadRow {
  // Fields from ai_human_comparison (via JOIN)
  changed: boolean | null
  email: string | null
  qualityPercentage: number | null // Calculated quality for this thread
}

/**
 * Support Overview KPIs
 */
export interface SupportKPIs {
  aiDraftCoverage: {
    current: number // % of threads with AI draft
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
