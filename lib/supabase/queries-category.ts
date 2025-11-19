import { supabaseServer } from './server'
import type {
  CategoryKPIData,
  CategoryWeeklyTrend,
  CategoryVersionStats,
  CategoryAgentStats,
  CategoryRecord,
  CategoryFilters,
  TrendData,
} from './types'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns'

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
 * Get KPI data for one or more categories
 */
export async function getCategoryKPIData(
  categories: string[],
  filters: CategoryFilters
): Promise<CategoryKPIData> {
  const { dateRange, versions, agents } = filters
  const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

  // Build email filter
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  // Select only necessary fields
  const selectFields = 'changed'

  // Build base query for current period
  let currentQuery = supabase
    .from('ai_human_comparison')
    .select(selectFields, { count: 'exact' })
    .in('request_subtype', categories)
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)

  // Build base query for previous period
  let previousQuery = supabase
    .from('ai_human_comparison')
    .select(selectFields, { count: 'exact' })
    .in('request_subtype', categories)
    .gte('created_at', previousPeriod.from.toISOString())
    .lte('created_at', previousPeriod.to.toISOString())
    .in('email', emailFilter)

  // Apply version filter if specified
  if (versions.length > 0) {
    currentQuery = currentQuery.in('prompt_version', versions)
    previousQuery = previousQuery.in('prompt_version', versions)
  }

  const [
    { data: currentData, count: currentCount },
    { data: previousData, count: previousCount },
  ] = await Promise.all([currentQuery, previousQuery])

  if (!currentData || !previousData) {
    throw new Error('Failed to fetch category KPI data')
  }

  type KPIRecord = { changed: boolean }
  const currentRecords = currentData as unknown as KPIRecord[]
  const previousRecords = previousData as unknown as KPIRecord[]

  // Calculate metrics
  const currentTotal = currentCount || 0
  const previousTotal = previousCount || 0

  const currentChanged = currentRecords.filter((r) => r.changed).length
  const previousChanged = previousRecords.filter((r) => r.changed).length

  const currentGood = currentTotal - currentChanged
  const previousGood = previousTotal - previousChanged

  const currentQuality = currentTotal > 0 ? (currentGood / currentTotal) * 100 : 0
  const previousQuality = previousTotal > 0 ? (previousGood / previousTotal) * 100 : 0

  return {
    totalRecords: {
      current: currentTotal,
      previous: previousTotal,
      trend: calculateTrend(currentTotal, previousTotal),
    },
    quality: {
      current: currentQuality,
      previous: previousQuality,
      trend: calculateTrend(currentQuality, previousQuality),
    },
    changed: {
      current: currentChanged,
      previous: previousChanged,
      trend: calculateTrend(currentChanged, previousChanged),
    },
  }
}

/**
 * Get weekly trend data for category (last 12 weeks)
 */
export async function getCategoryWeeklyTrends(
  categories: string[],
  filters: CategoryFilters
): Promise<CategoryWeeklyTrend[]> {
  const { dateRange, versions, agents } = filters
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  // Fetch all records for the date range
  let query = supabase
    .from('ai_human_comparison')
    .select('created_at, changed')
    .in('request_subtype', categories)
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)
    .order('created_at', { ascending: true })

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }

  const { data, error } = await query

  if (error || !data) {
    throw new Error('Failed to fetch category weekly trends')
  }

  type WeekRecord = { created_at: string; changed: boolean }
  const records = data as unknown as WeekRecord[]

  // Group by week
  const weekMap = new Map<string, { total: number; good: number; changed: number }>()

  records.forEach((record) => {
    const date = new Date(record.created_at)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
    const weekKey = weekStart.toISOString()

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { total: 0, good: 0, changed: 0 })
    }

    const weekData = weekMap.get(weekKey)!
    weekData.total++
    if (!record.changed) weekData.good++
    if (record.changed) weekData.changed++
  })

  // Convert to array and sort
  const trends: CategoryWeeklyTrend[] = Array.from(weekMap.entries())
    .map(([weekStartStr, stats]) => {
      const weekStart = new Date(weekStartStr)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

      return {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        totalRecords: stats.total,
        goodRecords: stats.good,
        goodPercentage: stats.total > 0 ? (stats.good / stats.total) * 100 : 0,
        changedRecords: stats.changed,
      }
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))

  return trends
}

/**
 * Get version breakdown stats for category
 */
export async function getCategoryVersionStats(
  categories: string[],
  filters: CategoryFilters
): Promise<CategoryVersionStats[]> {
  const { dateRange, versions, agents } = filters
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  // Fetch records grouped by version
  let query = supabase
    .from('ai_human_comparison')
    .select('prompt_version, changed')
    .in('request_subtype', categories)
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }

  const { data, error } = await query

  if (error || !data) {
    throw new Error('Failed to fetch category version stats')
  }

  type VersionRecord = { prompt_version: string | null; changed: boolean }
  const records = data as unknown as VersionRecord[]

  // Group by version
  const versionMap = new Map<string, { total: number; good: number; changed: number }>()

  records.forEach((record) => {
    const version = record.prompt_version || 'unknown'

    if (!versionMap.has(version)) {
      versionMap.set(version, { total: 0, good: 0, changed: 0 })
    }

    const versionData = versionMap.get(version)!
    versionData.total++
    if (!record.changed) versionData.good++
    if (record.changed) versionData.changed++
  })

  // Convert to array and sort by quality (descending)
  const stats: CategoryVersionStats[] = Array.from(versionMap.entries())
    .map(([version, data]) => ({
      version,
      totalRecords: data.total,
      goodRecords: data.good,
      goodPercentage: data.total > 0 ? (data.good / data.total) * 100 : 0,
      changedRecords: data.changed,
    }))
    .sort((a, b) => b.goodPercentage - a.goodPercentage)

  return stats
}

/**
 * Get agent breakdown stats for category
 */
export async function getCategoryAgentStats(
  categories: string[],
  filters: CategoryFilters
): Promise<CategoryAgentStats[]> {
  const { dateRange, versions, agents } = filters
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  // Fetch records grouped by agent
  let query = supabase
    .from('ai_human_comparison')
    .select('email, changed')
    .in('request_subtype', categories)
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }

  const { data, error } = await query

  if (error || !data) {
    throw new Error('Failed to fetch category agent stats')
  }

  type AgentRecord = { email: string | null; changed: boolean }
  const records = data as unknown as AgentRecord[]

  // Group by agent
  const agentMap = new Map<string, { total: number; good: number; changed: number }>()

  records.forEach((record) => {
    const agent = record.email || 'unknown'

    if (!agentMap.has(agent)) {
      agentMap.set(agent, { total: 0, good: 0, changed: 0 })
    }

    const agentData = agentMap.get(agent)!
    agentData.total++
    if (!record.changed) agentData.good++
    if (record.changed) agentData.changed++
  })

  // Convert to array and sort by quality (descending)
  const stats: CategoryAgentStats[] = Array.from(agentMap.entries())
    .map(([agent, data]) => ({
      agent,
      totalRecords: data.total,
      goodRecords: data.good,
      goodPercentage: data.total > 0 ? (data.good / data.total) * 100 : 0,
      changedRecords: data.changed,
    }))
    .sort((a, b) => b.goodPercentage - a.goodPercentage)

  return stats
}

/**
 * Get detailed records for category (with pagination)
 */
export async function getCategoryRecords(
  categories: string[],
  filters: CategoryFilters,
  pagination: { page: number; pageSize: number }
): Promise<{ data: CategoryRecord[]; total: number }> {
  const { dateRange, versions, agents } = filters
  const { page, pageSize } = pagination
  const emailFilter = agents.length > 0 ? agents : [...QUALIFIED_AGENTS]

  // Build query
  let query = supabase
    .from('ai_human_comparison')
    .select('id, prompt_version, created_at, email, changed', { count: 'exact' })
    .in('request_subtype', categories)
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .in('email', emailFilter)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }

  const { data, count, error } = await query

  if (error || !data) {
    throw new Error('Failed to fetch category records')
  }

  type RecordRow = {
    id: number
    prompt_version: string | null
    created_at: string
    email: string | null
    changed: boolean
  }

  const records = (data as unknown as RecordRow[]).map((record) => {
    const date = new Date(record.created_at)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekNumber = Math.floor(
      (date.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )

    return {
      id: record.id,
      version: record.prompt_version || 'unknown',
      week: `Week ${format(weekStart, 'w')}`,
      weekStart: weekStart.toISOString(),
      agent: record.email || 'unknown',
      changed: record.changed,
      createdAt: record.created_at,
    }
  })

  return {
    data: records,
    total: count || 0,
  }
}

/**
 * Check if category exists
 */
export async function categoryExists(categoryName: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('ai_human_comparison')
    .select('id', { count: 'exact', head: true })
    .eq('request_subtype', categoryName)
    .limit(1)

  if (error) {
    console.error('Error checking category existence:', error)
    return false
  }

  return (count || 0) > 0
}
