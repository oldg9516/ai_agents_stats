'use server'

/**
 * Dashboard Server Actions
 *
 * Server-side functions that can be called directly from Client Components
 * Using Next.js 16 Server Actions for optimal performance and type safety
 */

import {
  getKPIData,
  getQualityTrends,
  getCategoryDistribution,
  getVersionComparison,
  getDetailedStats,
  getFilterOptions,
  getDefaultFilters,
} from '@/lib/supabase/queries'
import type {
  KPIData,
  QualityTrendData,
  CategoryDistributionData,
  VersionComparisonData,
  DetailedStatsRow,
  DashboardFilters,
  FilterOptions,
} from '@/lib/supabase/types'

/**
 * Fetch all dashboard data in one Server Action
 * Returns all KPI, charts, and table data
 */
export async function fetchDashboardData(filters: DashboardFilters) {
  try {
    // Fetch all data in parallel for best performance
    const [kpi, qualityTrends, categoryDistribution, versionComparison, detailedStats] =
      await Promise.all([
        getKPIData(filters),
        getQualityTrends(filters),
        getCategoryDistribution(filters),
        getVersionComparison(filters),
        getDetailedStats(filters),
      ])

    return {
      success: true,
      data: {
        kpi,
        qualityTrends,
        categoryDistribution,
        versionComparison,
        detailedStats,
      },
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
    }
  }
}

/**
 * Fetch only KPI data
 * Useful for quick updates without fetching charts/table
 */
export async function fetchKPIData(filters: DashboardFilters): Promise<KPIData> {
  return await getKPIData(filters)
}

/**
 * Fetch quality trends for the main chart
 */
export async function fetchQualityTrends(
  filters: DashboardFilters
): Promise<QualityTrendData[]> {
  return await getQualityTrends(filters)
}

/**
 * Fetch category distribution for pie chart
 */
export async function fetchCategoryDistribution(
  filters: DashboardFilters
): Promise<CategoryDistributionData[]> {
  return await getCategoryDistribution(filters)
}

/**
 * Fetch version comparison for bar chart
 */
export async function fetchVersionComparison(
  filters: DashboardFilters
): Promise<VersionComparisonData[]> {
  return await getVersionComparison(filters)
}

/**
 * Fetch detailed stats for the table
 */
export async function fetchDetailedStats(
  filters: DashboardFilters
): Promise<DetailedStatsRow[]> {
  return await getDetailedStats(filters)
}

/**
 * Get available filter options (versions, categories)
 */
export async function fetchFilterOptions(): Promise<FilterOptions> {
  return await getFilterOptions()
}

/**
 * Get default filters
 * Note: This is a pure function, but exported as Server Action for consistency
 */
export async function fetchDefaultFilters(): Promise<DashboardFilters> {
  return getDefaultFilters()
}
