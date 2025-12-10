/**
 * Dashboard queries - refactored into separate modules
 *
 * This file re-exports all functions from the queries/ directory
 * for backward compatibility with existing imports.
 *
 * Module structure:
 * - queries/utils.ts      - Utility functions (calculateTrend, formatDate, etc.)
 * - queries/kpi.ts        - KPI data queries (getKPIData)
 * - queries/charts.ts     - Chart data queries (getQualityTrends, getCategoryDistribution, getVersionComparison)
 * - queries/detailed-stats.ts - Detailed stats queries (getDetailedStats, getDetailedStatsPaginated)
 * - queries/filters.ts    - Filter queries (getFilterOptions, getMinCreatedDate, getDefaultFilters)
 */

// Re-export everything from the queries module
export * from './queries/index'
