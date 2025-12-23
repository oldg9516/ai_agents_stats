/**
 * Centralized React Query cache configuration
 *
 * All cache settings should use these constants for consistency
 */

/**
 * Default cache configuration for data queries
 */
export const QUERY_CACHE_CONFIG = {
	/** Time in ms before data is considered stale */
	staleTime: 5 * 60 * 1000, // 5 minutes

	/** Time in ms to keep unused data in cache */
	gcTime: 15 * 60 * 1000, // 15 minutes

	/** Number of retry attempts for failed requests */
	retry: 2,

	/** Delay between retries in ms */
	retryDelay: 1000,

	/** Whether to refetch on window focus */
	refetchOnWindowFocus: false,
} as const

/**
 * Extended cache configuration for rarely-changing data (e.g., filter options)
 */
export const QUERY_CACHE_CONFIG_EXTENDED = {
	...QUERY_CACHE_CONFIG,
	staleTime: 10 * 60 * 1000, // 10 minutes
	gcTime: 30 * 60 * 1000, // 30 minutes
} as const

/**
 * Request timeout in milliseconds
 */
export const REQUEST_TIMEOUT = 30000 // 30 seconds
