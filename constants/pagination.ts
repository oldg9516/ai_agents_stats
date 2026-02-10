/**
 * Pagination and batch size constants
 *
 * Centralizes all magic numbers related to data loading, pagination, and batch processing.
 */

// =============================================================================
// CLIENT-SIDE PAGINATION (UI tables, incremental loading)
// =============================================================================

/** Records fetched per server request (threads, tickets) */
export const CLIENT_BATCH_SIZE = 60

/** Maximum batches kept in memory */
export const MAX_BATCHES = 20

/** Maximum records in memory (CLIENT_BATCH_SIZE * MAX_BATCHES) */
export const MAX_CLIENT_RECORDS = CLIENT_BATCH_SIZE * MAX_BATCHES

/** Default rows shown per table page in modals */
export const MODAL_PAGE_SIZE = 20

/** Default rows shown per page in backlog reports */
export const REPORT_PAGE_SIZE = 10

// =============================================================================
// SERVER-SIDE BATCH SIZES (Supabase queries)
// =============================================================================

/** Default batch size for Supabase RPC / query helpers */
export const SUPABASE_BATCH_SIZE = 500

/** Batch size for Supabase support thread queries */
export const SUPABASE_THREAD_BATCH_SIZE = 300

/** Batch size for human response lookups */
export const HUMAN_RESPONSE_BATCH_SIZE = 50

/** Large batch size for detailed stats / data processing */
export const LARGE_BATCH_SIZE = 1000

/** Batch size for dialog fetching */
export const DIALOG_BATCH_SIZE = 300

/** Maximum concurrent batch requests */
export const MAX_CONCURRENT_BATCHES = 3

// =============================================================================
// TIMEOUTS
// =============================================================================

/** Default request timeout in milliseconds (30 seconds) */
export const REQUEST_TIMEOUT = 30000
