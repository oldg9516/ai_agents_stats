'use client'

/**
 * Hook to fetch all dashboard data based on filters
 *
 * This is a re-export of the TanStack Query-based useDashboardData hook
 * to maintain backward compatibility with existing components.
 *
 * Features:
 * - Automatic caching and request deduplication
 * - Background refetching on window focus
 * - Real-time updates via Supabase subscriptions
 * - Optimistic loading with prefetch support
 */
export { useDashboardData, usePrefetchDashboardData } from '@/lib/queries/dashboard-queries'
