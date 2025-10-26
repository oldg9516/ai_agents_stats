'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { fetchDashboardData } from '@/lib/actions/dashboard-actions'
import type {
  KPIData,
  QualityTrendData,
  CategoryDistributionData,
  VersionComparisonData,
  DetailedStatsRow,
  DashboardFilters,
} from '@/lib/supabase/types'

interface DashboardData {
  kpi: KPIData | null
  qualityTrends: QualityTrendData[]
  categoryDistribution: CategoryDistributionData[]
  versionComparison: VersionComparisonData[]
  detailedStats: DetailedStatsRow[]
}

interface UseDashboardDataReturn {
  data: DashboardData
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch all dashboard data based on filters
 * Includes real-time updates via Supabase subscriptions
 */
export function useDashboardData(filters: DashboardFilters): UseDashboardDataReturn {
  const router = useRouter()
  const [data, setData] = useState<DashboardData>({
    kpi: null,
    qualityTrends: [],
    categoryDistribution: [],
    versionComparison: [],
    detailedStats: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Serialize filters for stable dependency
  const filtersKey = JSON.stringify({
    from: filters.dateRange.from.toISOString(),
    to: filters.dateRange.to.toISOString(),
    versions: filters.versions.sort(),
    categories: filters.categories.sort(),
    agents: filters.agents.sort(),
  })

  // Data fetch - runs when filters change
  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        // Call Server Action to fetch all data
        const result = await fetchDashboardData(filters)

        if (!mounted) return

        if (result.success && result.data) {
          setData({
            kpi: result.data.kpi,
            qualityTrends: result.data.qualityTrends,
            categoryDistribution: result.data.categoryDistribution,
            versionComparison: result.data.versionComparison,
            detailedStats: result.data.detailedStats,
          })
        } else {
          setError(new Error(result.error || 'Failed to fetch dashboard data'))
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]) // Re-fetch when filters change

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('ai_human_comparison_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'ai_human_comparison',
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          // Refresh Server Components when changes occur
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // Refetch function
  const refetch = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Call Server Action to fetch all data
      const result = await fetchDashboardData(filters)

      if (result.success && result.data) {
        setData({
          kpi: result.data.kpi,
          qualityTrends: result.data.qualityTrends,
          categoryDistribution: result.data.categoryDistribution,
          versionComparison: result.data.versionComparison,
          detailedStats: result.data.detailedStats,
        })
      } else {
        setError(new Error(result.error || 'Failed to fetch dashboard data'))
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}
