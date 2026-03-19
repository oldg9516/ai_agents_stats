'use server'

/**
 * Server Actions for Category Detail
 *
 * These actions fetch category-specific data from the database
 * using the service role client to bypass RLS
 */

import {
  getCategoryKPIData,
  getCategoryWeeklyTrends,
  getCategoryVersionStats,
  getCategoryAgentStats,
  getCategoryRecords,
  categoryExists,
} from '@/lib/db/queries-category'
import type {
  CategoryDetailData,
  CategoryFilters,
  CategoryKPIData,
  CategoryWeeklyTrend,
  CategoryVersionStats,
  CategoryAgentStats,
  CategoryRecord,
} from '@/lib/db/types'
import { endOfTodayInIsrael, startOfNDaysAgoInIsrael } from '@/lib/utils/date-tz'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Fetch complete category detail data
 * Supports single category or multiple categories (array)
 */
export async function fetchCategoryDetail(
  categories: string | string[],
  filters?: Partial<CategoryFilters>,
  pagination?: { page: number; pageSize: number }
): Promise<ActionResult<CategoryDetailData>> {
  try {
    // Normalize to array
    const categoryArray = Array.isArray(categories) ? categories : [categories]
    const categoryName = categoryArray.join(',') // For display

    // Check if first category exists (basic validation)
    const exists = await categoryExists(categoryArray[0])
    if (!exists) {
      return { success: false, error: `Category "${categoryArray[0]}" not found` }
    }

    // Default filters
    const defaultFilters: CategoryFilters = {
      dateRange: {
        from: startOfNDaysAgoInIsrael(29),
        to: endOfTodayInIsrael(),
      },
      versions: [], // All versions
      agents: [], // All agents (no filter)
    }

    const appliedFilters: CategoryFilters = {
      dateRange: filters?.dateRange || defaultFilters.dateRange,
      versions: filters?.versions || defaultFilters.versions,
      agents: filters?.agents || defaultFilters.agents,
    }

    const defaultPagination = { page: 0, pageSize: 50 }
    const appliedPagination = pagination || defaultPagination

    // Fetch all data in parallel for performance
    const [kpis, weeklyTrends, versionStats, agentStats, records] = await Promise.all([
      getCategoryKPIData(categoryArray, appliedFilters),
      getCategoryWeeklyTrends(categoryArray, appliedFilters),
      getCategoryVersionStats(categoryArray, appliedFilters),
      getCategoryAgentStats(categoryArray, appliedFilters),
      getCategoryRecords(categoryArray, appliedFilters, appliedPagination),
    ])

    return {
      success: true,
      data: {
        categoryName, // Display name (comma-separated if multiple)
        kpis,
        weeklyTrends,
        versionStats,
        agentStats,
        records,
      },
    }
  } catch (error) {
    console.error('fetchCategoryDetail failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch only KPI data (lighter query)
 */
export async function fetchCategoryKPIs(
  categoryName: string,
  filters?: Partial<CategoryFilters>
): Promise<ActionResult<CategoryKPIData>> {
  try {
    const exists = await categoryExists(categoryName)
    if (!exists) {
      return { success: false, error: `Category "${categoryName}" not found` }
    }

    const defaultFilters: CategoryFilters = {
      dateRange: {
        from: startOfNDaysAgoInIsrael(29),
        to: endOfTodayInIsrael(),
      },
      versions: [],
      agents: [], // All agents (no filter)
    }

    const appliedFilters: CategoryFilters = {
      dateRange: filters?.dateRange || defaultFilters.dateRange,
      versions: filters?.versions || defaultFilters.versions,
      agents: filters?.agents || defaultFilters.agents,
    }

    return { success: true, data: await getCategoryKPIData([categoryName], appliedFilters) }
  } catch (error) {
    console.error('fetchCategoryKPIs failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch only weekly trends (for charts)
 */
export async function fetchCategoryTrends(
  categoryName: string,
  filters?: Partial<CategoryFilters>
): Promise<ActionResult<CategoryWeeklyTrend[]>> {
  try {
    const exists = await categoryExists(categoryName)
    if (!exists) {
      return { success: false, error: `Category "${categoryName}" not found` }
    }

    const defaultFilters: CategoryFilters = {
      dateRange: {
        from: startOfNDaysAgoInIsrael(83), // Last 12 weeks
        to: endOfTodayInIsrael(),
      },
      versions: [],
      agents: [], // All agents (no filter)
    }

    const appliedFilters: CategoryFilters = {
      dateRange: filters?.dateRange || defaultFilters.dateRange,
      versions: filters?.versions || defaultFilters.versions,
      agents: filters?.agents || defaultFilters.agents,
    }

    return { success: true, data: await getCategoryWeeklyTrends([categoryName], appliedFilters) }
  } catch (error) {
    console.error('fetchCategoryTrends failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch version breakdown
 */
export async function fetchCategoryVersions(
  categoryName: string,
  filters?: Partial<CategoryFilters>
): Promise<ActionResult<CategoryVersionStats[]>> {
  try {
    const exists = await categoryExists(categoryName)
    if (!exists) {
      return { success: false, error: `Category "${categoryName}" not found` }
    }

    const defaultFilters: CategoryFilters = {
      dateRange: {
        from: startOfNDaysAgoInIsrael(29),
        to: endOfTodayInIsrael(),
      },
      versions: [],
      agents: [], // All agents (no filter)
    }

    const appliedFilters: CategoryFilters = {
      dateRange: filters?.dateRange || defaultFilters.dateRange,
      versions: filters?.versions || defaultFilters.versions,
      agents: filters?.agents || defaultFilters.agents,
    }

    return { success: true, data: await getCategoryVersionStats([categoryName], appliedFilters) }
  } catch (error) {
    console.error('fetchCategoryVersions failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch agent breakdown
 */
export async function fetchCategoryAgents(
  categoryName: string,
  filters?: Partial<CategoryFilters>
): Promise<ActionResult<CategoryAgentStats[]>> {
  try {
    const exists = await categoryExists(categoryName)
    if (!exists) {
      return { success: false, error: `Category "${categoryName}" not found` }
    }

    const defaultFilters: CategoryFilters = {
      dateRange: {
        from: startOfNDaysAgoInIsrael(29),
        to: endOfTodayInIsrael(),
      },
      versions: [],
      agents: [], // All agents (no filter)
    }

    const appliedFilters: CategoryFilters = {
      dateRange: filters?.dateRange || defaultFilters.dateRange,
      versions: filters?.versions || defaultFilters.versions,
      agents: filters?.agents || defaultFilters.agents,
    }

    return { success: true, data: await getCategoryAgentStats([categoryName], appliedFilters) }
  } catch (error) {
    console.error('fetchCategoryAgents failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch detailed records with pagination
 */
export async function fetchCategoryRecordsPage(
  categoryName: string,
  filters?: Partial<CategoryFilters>,
  pagination?: { page: number; pageSize: number }
): Promise<ActionResult<{ data: CategoryRecord[]; total: number }>> {
  try {
    const exists = await categoryExists(categoryName)
    if (!exists) {
      return { success: false, error: `Category "${categoryName}" not found` }
    }

    const defaultFilters: CategoryFilters = {
      dateRange: {
        from: startOfNDaysAgoInIsrael(29),
        to: endOfTodayInIsrael(),
      },
      versions: [],
      agents: [], // All agents (no filter)
    }

    const appliedFilters: CategoryFilters = {
      dateRange: filters?.dateRange || defaultFilters.dateRange,
      versions: filters?.versions || defaultFilters.versions,
      agents: filters?.agents || defaultFilters.agents,
    }

    const defaultPagination = { page: 0, pageSize: 50 }
    const appliedPagination = pagination || defaultPagination

    return { success: true, data: await getCategoryRecords([categoryName], appliedFilters, appliedPagination) }
  } catch (error) {
    console.error('fetchCategoryRecordsPage failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Check if category exists (for validation)
 */
export async function checkCategoryExists(categoryName: string): Promise<ActionResult<boolean>> {
  try {
    return { success: true, data: await categoryExists(categoryName) }
  } catch (error) {
    console.error('checkCategoryExists failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
