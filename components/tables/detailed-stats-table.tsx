/**
 * Detailed Stats Table
 *
 * This file re-exports from the modular detailed-stats directory.
 * The table has been refactored into smaller, focused modules:
 *
 * - detailed-stats/types.ts - Types and utility functions
 * - detailed-stats/base-columns.tsx - Base columns (category, version, dates, totals)
 * - detailed-stats/legacy-columns.tsx - Legacy mode columns (5 classifications)
 * - detailed-stats/new-columns.tsx - New mode columns (4 aggregated groups)
 * - detailed-stats/table-pagination.tsx - Pagination component
 * - detailed-stats/detailed-stats-table.tsx - Main table component
 */

export * from './detailed-stats'
