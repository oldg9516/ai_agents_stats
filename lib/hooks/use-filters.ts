'use client'

/**
 * Hook for managing dashboard filters
 *
 * This is a re-export of the Zustand-based useDashboardFilters hook
 * to maintain backward compatibility with existing components.
 *
 * Features:
 * - Global state management via Zustand
 * - URL sync (shareable links)
 * - localStorage persistence
 * - Default values
 */
export { useDashboardFilters as useFilters } from '@/lib/store/hooks/use-dashboard-filters'
