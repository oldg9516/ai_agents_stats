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
} from '@/lib/supabase/queries-category'
import type {
  CategoryDetailData,
  CategoryFilters,
  CategoryKPIData,
  CategoryWeeklyTrend,
  CategoryVersionStats,
  CategoryAgentStats,
  CategoryRecord,
} from '@/lib/supabase/types'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { subDays } from 'date-fns'

/**
 * Fetch complete category detail data
 * Supports single category or multiple categories (array)
 */
export async function fetchCategoryDetail(
  categories: string | string[],
  filters?: Partial<CategoryFilters>,
  pagination?: { page: number; pageSize: number }
): Promise<CategoryDetailData> {
  // Normalize to array
  const categoryArray = Array.isArray(categories) ? categories : [categories]
  const categoryName = categoryArray.join(',') // For display

  // Check if first category exists (basic validation)
  const exists = await categoryExists(categoryArray[0])
  if (!exists) {
    throw new Error(`Category "${categoryArray[0]}" not found`)
  }

  // Default filters
  const defaultFilters: CategoryFilters = {
    dateRange: {
      from: subDays(new Date(), 30), // Last 30 days by default
      to: new Date(),
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
    categoryName, // Display name (comma-separated if multiple)
    kpis,
    weeklyTrends,
    versionStats,
    agentStats,
    records,
  }
}

/**
 * Fetch only KPI data (lighter query)
 */
export async function fetchCategoryKPIs(
  categoryName: string,
  filters?: Partial<CategoryFilters>
): Promise<CategoryKPIData> {
  const exists = await categoryExists(categoryName)
  if (!exists) {
    throw new Error(`Category "${categoryName}" not found`)
  }

  const defaultFilters: CategoryFilters = {
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    versions: [],
    agents: [], // All agents (no filter)
  }

  const appliedFilters: CategoryFilters = {
    dateRange: filters?.dateRange || defaultFilters.dateRange,
    versions: filters?.versions || defaultFilters.versions,
    agents: filters?.agents || defaultFilters.agents,
  }

  return getCategoryKPIData(categoryName, appliedFilters)
}

/**
 * Fetch only weekly trends (for charts)
 */
export async function fetchCategoryTrends(
  categoryName: string,
  filters?: Partial<CategoryFilters>
): Promise<CategoryWeeklyTrend[]> {
  const exists = await categoryExists(categoryName)
  if (!exists) {
    throw new Error(`Category "${categoryName}" not found`)
  }

  const defaultFilters: CategoryFilters = {
    dateRange: {
      from: subDays(new Date(), 84), // Last 12 weeks
      to: new Date(),
    },
    versions: [],
    agents: [], // All agents (no filter)
  }

  const appliedFilters: CategoryFilters = {
    dateRange: filters?.dateRange || defaultFilters.dateRange,
    versions: filters?.versions || defaultFilters.versions,
    agents: filters?.agents || defaultFilters.agents,
  }

  return getCategoryWeeklyTrends(categoryName, appliedFilters)
}

/**
 * Fetch version breakdown
 */
export async function fetchCategoryVersions(
  categoryName: string,
  filters?: Partial<CategoryFilters>
): Promise<CategoryVersionStats[]> {
  const exists = await categoryExists(categoryName)
  if (!exists) {
    throw new Error(`Category "${categoryName}" not found`)
  }

  const defaultFilters: CategoryFilters = {
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    versions: [],
    agents: [], // All agents (no filter)
  }

  const appliedFilters: CategoryFilters = {
    dateRange: filters?.dateRange || defaultFilters.dateRange,
    versions: filters?.versions || defaultFilters.versions,
    agents: filters?.agents || defaultFilters.agents,
  }

  return getCategoryVersionStats(categoryName, appliedFilters)
}

/**
 * Fetch agent breakdown
 */
export async function fetchCategoryAgents(
  categoryName: string,
  filters?: Partial<CategoryFilters>
): Promise<CategoryAgentStats[]> {
  const exists = await categoryExists(categoryName)
  if (!exists) {
    throw new Error(`Category "${categoryName}" not found`)
  }

  const defaultFilters: CategoryFilters = {
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    versions: [],
    agents: [], // All agents (no filter)
  }

  const appliedFilters: CategoryFilters = {
    dateRange: filters?.dateRange || defaultFilters.dateRange,
    versions: filters?.versions || defaultFilters.versions,
    agents: filters?.agents || defaultFilters.agents,
  }

  return getCategoryAgentStats(categoryName, appliedFilters)
}

/**
 * Fetch detailed records with pagination
 */
export async function fetchCategoryRecordsPage(
  categoryName: string,
  filters?: Partial<CategoryFilters>,
  pagination?: { page: number; pageSize: number }
): Promise<{ data: CategoryRecord[]; total: number }> {
  const exists = await categoryExists(categoryName)
  if (!exists) {
    throw new Error(`Category "${categoryName}" not found`)
  }

  const defaultFilters: CategoryFilters = {
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
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

  return getCategoryRecords(categoryName, appliedFilters, appliedPagination)
}

/**
 * Check if category exists (for validation)
 */
export async function checkCategoryExists(categoryName: string): Promise<boolean> {
  return categoryExists(categoryName)
}
