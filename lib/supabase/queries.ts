import { supabaseServer } from './server'
import type {
  KPIData,
  QualityTrendData,
  CategoryDistributionData,
  VersionComparisonData,
  DetailedStatsRow,
  FilterOptions,
  DashboardFilters,
  TrendData,
  AIHumanComparisonRow,
} from './types'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { subDays, startOfDay, endOfDay } from 'date-fns'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

/**
 * Calculate trend data from current and previous values
 */
function calculateTrend(current: number, previous: number): TrendData {
  const value = current - previous
  const percentage = previous === 0 ? 0 : ((current - previous) / previous) * 100

  let direction: 'up' | 'down' | 'neutral' = 'neutral'
  if (value > 0) direction = 'up'
  else if (value < 0) direction = 'down'

  return {
    value: Math.abs(value),
    percentage: Math.abs(percentage),
    direction,
  }
}

/**
 * Get date range for previous period (same duration as current)
 */
function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const duration = to.getTime() - from.getTime()
  const previousTo = new Date(from.getTime() - 1) // 1ms before current from
  const previousFrom = new Date(previousTo.getTime() - duration)

  return {
    from: previousFrom,
    to: previousTo,
  }
}

/**
 * Fetch KPI Data with trends
 */
export async function getKPIData(filters: DashboardFilters): Promise<KPIData> {
  const { dateRange, versions, categories, agents } = filters
  const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

  // Build base query
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  // OPTIMIZATION: Select only fields needed for KPI calculation (not SELECT *)
  // This reduces data transfer significantly (only 2 fields instead of all)
  const selectFields = 'changed, request_subtype'

  let currentQuery = supabase
    .from('ai_human_comparison')
    .select(selectFields, { count: 'exact' })
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)

  let previousQuery = supabase
    .from('ai_human_comparison')
    .select(selectFields, { count: 'exact' })
    .gte('created_at', previousPeriod.from.toISOString())
    .lte('created_at', previousPeriod.to.toISOString())
    .in('email', emailFilter)

  // Apply filters
  if (versions.length > 0) {
    currentQuery = currentQuery.in('prompt_version', versions)
    previousQuery = previousQuery.in('prompt_version', versions)
  }
  if (categories.length > 0) {
    currentQuery = currentQuery.in('request_subtype', categories)
    previousQuery = previousQuery.in('request_subtype', categories)
  }

  const [
    { data: currentData, count: currentCount },
    { data: previousData, count: previousCount },
  ] = await Promise.all([currentQuery, previousQuery])

  if (!currentData || !previousData) {
    throw new Error('Failed to fetch KPI data')
  }

  // Type assertion after null check - only the fields we selected
  type KPIRecord = {
    changed: boolean
    request_subtype: string | null
  }
  const currentRecords = currentData as unknown as KPIRecord[]
  const previousRecords = previousData as unknown as KPIRecord[]

  // Calculate metrics - use count from query for accuracy
  const currentTotal = currentCount || 0
  const previousTotal = previousCount || 0

  const currentChanged = currentRecords.filter((r) => r.changed).length
  const previousChanged = previousRecords.filter((r) => r.changed).length

  const currentUnchanged = currentTotal - currentChanged
  const previousUnchanged = previousTotal - previousChanged

  const currentAvgQuality = currentTotal > 0 ? (currentUnchanged / currentTotal) * 100 : 0
  const previousAvgQuality = previousTotal > 0 ? (previousUnchanged / previousTotal) * 100 : 0

  // Calculate best category
  const categoryStats = currentRecords.reduce(
    (acc, record) => {
      const cat = record.request_subtype ?? 'unknown'
      if (!acc[cat]) {
        acc[cat] = { total: 0, unchanged: 0 }
      }
      acc[cat].total++
      if (!record.changed) acc[cat].unchanged++
      return acc
    },
    {} as Record<string, { total: number; unchanged: number }>
  )

  const bestCategory = Object.entries(categoryStats).reduce(
    (best, [cat, stats]) => {
      const percentage = (stats.unchanged / stats.total) * 100
      if (percentage > best.percentage) {
        return { category: cat, percentage }
      }
      return best
    },
    { category: '', percentage: 0 }
  )

  // Calculate previous percentage for best category
  const previousCategoryData = previousRecords.filter(
    (r) => r.request_subtype === bestCategory.category
  )
  const previousCategoryTotal = previousCategoryData.length
  const previousCategoryUnchanged = previousCategoryData.filter((r) => !r.changed).length
  const previousCategoryPercentage =
    previousCategoryTotal > 0 ? (previousCategoryUnchanged / previousCategoryTotal) * 100 : 0

  return {
    totalRecords: {
      current: currentTotal,
      previous: previousTotal,
      trend: calculateTrend(currentTotal, previousTotal),
    },
    averageQuality: {
      current: currentAvgQuality,
      previous: previousAvgQuality,
      trend: calculateTrend(currentAvgQuality, previousAvgQuality),
    },
    bestCategory: {
      category: bestCategory.category,
      percentage: bestCategory.percentage,
      previousPercentage: previousCategoryPercentage,
      trend: calculateTrend(bestCategory.percentage, previousCategoryPercentage),
    },
    recordsChanged: {
      current: currentChanged,
      previous: previousChanged,
      trend: calculateTrend(currentChanged, previousChanged),
    },
  }
}

/**
 * Fetch Quality Trends data (for line chart)
 */
export async function getQualityTrends(
  filters: DashboardFilters
): Promise<QualityTrendData[]> {
  const { dateRange, versions, categories, agents } = filters
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  let query = supabase
    .from('ai_human_comparison')
    .select('request_subtype, created_at, changed')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }
  if (categories.length > 0) {
    query = query.in('request_subtype', categories)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data) return []

  const records = data as unknown as AIHumanComparisonRow[]

  // Group by category and week
  const grouped = records.reduce(
    (acc, record) => {
      const category = record.request_subtype ?? 'unknown'
      const weekStart = getWeekStart(new Date(record.created_at ?? new Date()))
      const key = `${category}|${weekStart}`

      if (!acc[key]) {
        acc[key] = { category, weekStart, total: 0, unchanged: 0 }
      }
      acc[key].total++
      if (!record.changed) acc[key].unchanged++

      return acc
    },
    {} as Record<string, { category: string; weekStart: string; total: number; unchanged: number }>
  )

  // Calculate percentages
  return Object.values(grouped).map((item) => ({
    category: item.category,
    weekStart: item.weekStart,
    goodPercentage: (item.unchanged / item.total) * 100,
  }))
}

/**
 * Get week start date (Monday) in ISO format
 */
function getWeekStart(date: Date): string {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  const monday = new Date(date.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

/**
 * Fetch Category Distribution data (for pie chart)
 */
export async function getCategoryDistribution(
  filters: DashboardFilters
): Promise<CategoryDistributionData[]> {
  const { dateRange, versions, categories, agents } = filters
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  let query = supabase
    .from('ai_human_comparison')
    .select('request_subtype, changed')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }
  if (categories.length > 0) {
    query = query.in('request_subtype', categories)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data) return []

  const records = data as unknown as AIHumanComparisonRow[]

  // Group by category
  const grouped = records.reduce(
    (acc, record) => {
      const cat = record.request_subtype ?? 'unknown'
      if (!acc[cat]) {
        acc[cat] = { total: 0, unchanged: 0 }
      }
      acc[cat].total++
      if (!record.changed) acc[cat].unchanged++
      return acc
    },
    {} as Record<string, { total: number; unchanged: number }>
  )

  return Object.entries(grouped).map(([category, stats]) => ({
    category,
    totalRecords: stats.total,
    goodPercentage: (stats.unchanged / stats.total) * 100,
  }))
}

/**
 * Fetch Version Comparison data (for bar chart)
 */
export async function getVersionComparison(
  filters: DashboardFilters
): Promise<VersionComparisonData[]> {
  const { dateRange, versions, categories, agents } = filters
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  let query = supabase
    .from('ai_human_comparison')
    .select('prompt_version, changed')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }
  if (categories.length > 0) {
    query = query.in('request_subtype', categories)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data) return []

  const records = data as unknown as AIHumanComparisonRow[]

  // Group by version
  const grouped = records.reduce(
    (acc, record) => {
      const ver = record.prompt_version ?? 'unknown'
      if (!acc[ver]) {
        acc[ver] = { total: 0, unchanged: 0 }
      }
      acc[ver].total++
      if (!record.changed) acc[ver].unchanged++
      return acc
    },
    {} as Record<string, { total: number; unchanged: number }>
  )

  return Object.entries(grouped)
    .map(([version, stats]) => ({
      version,
      totalRecords: stats.total,
      goodPercentage: (stats.unchanged / stats.total) * 100,
    }))
    .sort((a, b) => a.version.localeCompare(b.version))
}

/**
 * Fetch Detailed Stats (for table)
 */
export async function getDetailedStats(
  filters: DashboardFilters
): Promise<DetailedStatsRow[]> {
  const { dateRange, versions, categories, agents } = filters
  const agentList = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  let query = supabase
    .from('ai_human_comparison')
    .select('*')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', agentList)

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }
  if (categories.length > 0) {
    query = query.in('request_subtype', categories)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data) return []

  const records = data as unknown as AIHumanComparisonRow[]
  const rows: DetailedStatsRow[] = []

  // Group by category and version first (Level 1)
  const versionGroups = records.reduce(
    (acc, record) => {
      const category = record.request_subtype ?? 'unknown'
      const version = record.prompt_version ?? 'unknown'
      const key = `${category}|${version}`
      if (!acc[key]) {
        acc[key] = {
          category,
          version,
          records: [],
        }
      }
      acc[key].records.push(record)
      return acc
    },
    {} as Record<string, { category: string; version: string; records: AIHumanComparisonRow[] }>
  )

  // Process each version group
  Object.values(versionGroups).forEach((group) => {
    const qualifiedRecords = group.records.filter((r) => r.email && agentList.includes(r.email))
    const changedRecords = qualifiedRecords.filter((r) => r.changed)
    const unchangedRecords = qualifiedRecords.filter((r) => !r.changed)

    // Level 1: Version-level row
    rows.push({
      category: group.category,
      version: group.version,
      dates: null,
      sortOrder: 1,
      totalRecords: group.records.length,
      recordsQualifiedAgents: qualifiedRecords.length,
      changedRecords: changedRecords.length,
      goodPercentage:
        qualifiedRecords.length > 0
          ? Math.round((unchangedRecords.length / qualifiedRecords.length) * 100)
          : 0,
    })

    // Level 2: Week-level rows
    const weekGroups = group.records.reduce(
      (acc, record) => {
        const weekStart = getWeekStart(new Date(record.created_at ?? new Date()))
        if (!acc[weekStart]) {
          acc[weekStart] = []
        }
        acc[weekStart].push(record)
        return acc
      },
      {} as Record<string, AIHumanComparisonRow[]>
    )

    Object.entries(weekGroups).forEach(([weekStart, weekRecords]) => {
      const weekQualifiedRecords = weekRecords.filter((r) => r.email && agentList.includes(r.email))
      const weekChangedRecords = weekQualifiedRecords.filter((r) => r.changed)
      const weekUnchangedRecords = weekQualifiedRecords.filter((r) => !r.changed)

      const weekStartDate = new Date(weekStart)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 6)

      const dateRange = `${formatDate(weekStartDate)} — ${formatDate(weekEndDate)}`

      rows.push({
        category: group.category,
        version: group.version,
        dates: dateRange,
        sortOrder: 2,
        totalRecords: weekRecords.length,
        recordsQualifiedAgents: weekQualifiedRecords.length,
        changedRecords: weekChangedRecords.length,
        goodPercentage:
          weekQualifiedRecords.length > 0
            ? Math.round((weekUnchangedRecords.length / weekQualifiedRecords.length) * 100)
            : 0,
      })
    })
  })

  // Sort: category ASC, sortOrder ASC, version ASC, dates DESC
  return rows.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    if (a.version !== b.version) return a.version.localeCompare(b.version)
    if (a.dates && b.dates) return b.dates.localeCompare(a.dates)
    return 0
  })
}

/**
 * Format date as DD.MM.YYYY
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Get filter options (versions and categories)
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  const { data, error } = await supabase
    .from('ai_human_comparison')
    .select('prompt_version, request_subtype')

  if (error) throw error
  if (!data) return { versions: [], categories: [] }

  const records = data as unknown as AIHumanComparisonRow[]

  const versions = [...new Set(records.map((r) => r.prompt_version).filter((v): v is string => v !== null))].sort()
  const categories = [...new Set(records.map((r) => r.request_subtype).filter((c): c is string => c !== null))].sort()

  return { versions, categories }
}

/**
 * Get default filters (Last 30 days, all versions, all categories, all qualified agents)
 */
export function getDefaultFilters(): DashboardFilters {
  const to = endOfDay(new Date())
  const from = startOfDay(subDays(to, 30))

  return {
    dateRange: { from, to },
    versions: [],
    categories: [],
    agents: [...QUALIFIED_AGENTS],
  }
}
