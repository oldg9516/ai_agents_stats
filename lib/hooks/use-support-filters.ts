'use client'

/**
 * Support Filters Hook
 *
 * This is a re-export of the Zustand-based useSupportFilters hook
 * to maintain backward compatibility with existing components.
 *
 * Features:
 * - Global state management via Zustand
 * - URL sync (shareable links)
 * - localStorage persistence
 * - Default values
 */
export { useSupportFilters } from '@/lib/store/hooks/use-support-filters'
