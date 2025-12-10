/**
 * Detailed Stats Table Module
 *
 * Hierarchical table with version and week-level data for AI quality metrics.
 * Features server-side pagination, sorting, search, CSV export, and quality color coding.
 */

// Main component
export { DetailedStatsTable } from './detailed-stats-table'

// Types and utilities
export {
	type DetailedStatsTableProps,
	isNewLogic,
	checkIsLatestWeek,
	buildLatestWeeksMap,
	calcPercentage,
	getCellClassName,
} from './types'

// Column definitions
export { createBaseColumns, sortOrderColumn } from './base-columns'
export { createLegacyColumns } from './legacy-columns'
export { createNewColumns } from './new-columns'

// Sub-components
export { TablePagination } from './table-pagination'
