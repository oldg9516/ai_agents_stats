// Re-export all query functions from their respective modules
// This maintains backward compatibility with existing imports from '@/lib/supabase/queries'

// KPI queries
export { getKPIData } from './kpi'

// Chart queries
export {
	getCategoryDistribution,
	getQualityTrends,
	getVersionComparison,
} from './charts'

// Detailed stats: now handled by fetchDetailedStatsTS in lib/actions/detailed-stats-actions.ts

// Filter queries
export {
	getDefaultFilters,
	getFilterOptions,
	getMinCreatedDate,
} from './filters'

// Utility functions (exported for use in other modules if needed)
export {
	AI_ERROR_CLASSIFICATIONS,
	AI_QUALITY_CLASSIFICATIONS,
	calculateTrend,
	countClassifications,
	extractVersionNumber,
	formatDate,
	getDayStart,
	getPreviousPeriod,
	getWeekStart,
	isAiErrorClassification,
	isAiQualityClassification,
} from './utils'

// Re-export types for convenience
export type { ClassificationCounts, ClassificationRecord } from './utils'
