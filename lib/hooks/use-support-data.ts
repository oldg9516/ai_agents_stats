'use client'

/**
 * Support Data Hook
 *
 * This is a re-export of the TanStack Query-based useSupportData hook
 * to maintain backward compatibility with existing components.
 *
 * Features:
 * - Automatic caching and request deduplication
 * - Background refetching on window focus
 * - Real-time updates via Supabase subscriptions
 * - Parallel data fetching for optimal performance
 */
export { useSupportData, usePrefetchSupportData } from '@/lib/queries/support-queries'
