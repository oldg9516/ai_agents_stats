/**
 * Data Table - refactored into separate modules
 *
 * This file re-exports all components from the data-table/ directory
 * for backward compatibility with existing imports.
 *
 * Module structure:
 * - data-table/types.ts           - Schema and type definitions
 * - data-table/columns.tsx        - Column definitions
 * - data-table/drag-handle.tsx    - Drag handle for sortable rows
 * - data-table/draggable-row.tsx  - Draggable table row component
 * - data-table/table-cell-viewer.tsx - Cell viewer with drawer
 * - data-table/table-pagination.tsx  - Pagination controls
 * - data-table/data-table.tsx     - Main data table component
 */

// Re-export everything from the data-table module
export * from './data-table/index'
