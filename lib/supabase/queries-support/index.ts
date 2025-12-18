/**
 * Support Overview Database Queries
 *
 * Re-exports all queries from their respective modules
 * for backward compatibility with existing imports.
 *
 * Module structure:
 * - queries-support/utils.ts   - Utility functions (calculateTrend)
 * - queries-support/kpi.ts     - KPI queries (fetchSupportKPIs)
 * - queries-support/charts.ts  - Chart queries (status, resolution, sankey, correlation)
 * - queries-support/threads.ts - Thread queries (list, detail, category stats)
 */

// KPI queries
export { fetchSupportKPIs } from './kpi'

// Chart queries
export {
	fetchCorrelationMatrix,
	fetchResolutionTimeData,
	fetchSankeyData,
	fetchStatusDistribution,
} from './charts'

// Thread queries
export {
	fetchAvailableCategories,
	fetchRequestCategoryStats,
	fetchSupportThreads,
	fetchThreadDetail,
} from './threads'

// Utility functions (exported for use in other modules if needed)
export { calculateTrend } from './utils'
