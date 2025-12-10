/**
 * Data Table Components
 *
 * Modular data table with drag-and-drop, sorting, filtering, and pagination.
 *
 * Module structure:
 * - types.ts           - Schema and type definitions
 * - columns.tsx        - Column definitions
 * - drag-handle.tsx    - Drag handle component for sortable rows
 * - draggable-row.tsx  - Draggable table row component
 * - table-cell-viewer.tsx - Cell viewer with drawer
 * - table-pagination.tsx  - Pagination controls
 * - data-table.tsx     - Main data table component
 */

// Main component
export { DataTable } from './data-table'

// Sub-components (exported for potential reuse)
export { columns } from './columns'
export { DragHandle } from './drag-handle'
export { DraggableRow } from './draggable-row'
export { TableCellViewer } from './table-cell-viewer'
export { TablePagination } from './table-pagination'

// Types
export { schema, type DataTableRow } from './types'
