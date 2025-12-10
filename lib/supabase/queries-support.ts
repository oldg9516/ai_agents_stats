/**
 * Support Overview Database Queries - refactored into separate modules
 *
 * This file re-exports all functions from the queries-support/ directory
 * for backward compatibility with existing imports.
 *
 * Module structure:
 * - queries-support/utils.ts   - Utility functions (calculateTrend)
 * - queries-support/kpi.ts     - KPI queries (fetchSupportKPIs)
 * - queries-support/charts.ts  - Chart queries (status, resolution, sankey, correlation)
 * - queries-support/threads.ts - Thread queries (list, detail, category stats)
 */

// Re-export everything from the queries-support module
export * from './queries-support/index'
