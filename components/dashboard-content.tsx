'use client'

import { useMemo } from 'react'
import { useDashboardData } from '@/lib/hooks/use-dashboard-data'
import { getDefaultFilters } from '@/lib/supabase/queries'
import { KPISection } from './kpi/kpi-section'
import { KPISectionSkeleton } from './loading/kpi-skeleton'

// Note: getDefaultFilters() is a pure function, safe to call on client
// Server Actions are used for data fetching in useDashboardData hook

/**
 * Dashboard Content - Client Component
 *
 * Handles real-time data updates and interactivity
 * Wrapped in Suspense for progressive loading
 */
export function DashboardContent() {
  // Memoize filters to prevent recreating on every render
  const filters = useMemo(() => getDefaultFilters(), [])
  const { data, isLoading, error } = useDashboardData(filters)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
          Error Loading Dashboard
        </h3>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* KPI Cards Section */}
      {isLoading || !data.kpi ? (
        <KPISectionSkeleton />
      ) : (
        <KPISection data={data.kpi} />
      )}

      {/* Placeholder for future charts and table */}
      <div className="text-sm text-muted-foreground">
        Charts and detailed table will be added in next phases
      </div>
    </div>
  )
}
