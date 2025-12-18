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
import { startOfWeek, endOfWeek, format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

// Batch settings for fetching large datasets
const BATCH_SIZE = 500
const MAX_CONCURRENT = 3

/**
 * Helper to fetch all records in batches to bypass Supabase's 1000 record limit
 * When emailFilter is empty, no email filtering is applied (matches all agents)
 */
async function fetchAllForCategory<T>(
  supabaseClient: SupabaseClient,
  selectFields: string,
  categories: string[],
  dateFrom: Date,
  dateTo: Date,
  emailFilter: string[],
  versions: string[]
): Promise<T[]> {
  // First, get total count
  let countQuery = supabaseClient
    .from('ai_human_comparison')
    .select('*', { count: 'exact', head: true })
    .in('request_subtype', categories)
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  // Only filter by email if specific agents are provided
  if (emailFilter.length > 0) {
    countQuery = countQuery.in('email', emailFilter)
  }

  if (versions.length > 0) {
    countQuery = countQuery.in('prompt_version', versions)
  }

  const { count, error: countError } = await countQuery
  if (countError) throw countError

  const totalRecords = count || 0
  if (totalRecords === 0) return []

  // If under 1000, fetch in one request
  if (totalRecords <= 1000) {
    let query = supabaseClient
      .from('ai_human_comparison')
      .select(selectFields)
      .in('request_subtype', categories)
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())

    // Only filter by email if specific agents are provided
    if (emailFilter.length > 0) {
      query = query.in('email', emailFilter)
    }

    if (versions.length > 0) {
      query = query.in('prompt_version', versions)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as T[]
  }

  // Fetch in batches with limited concurrency
  const numBatches = Math.ceil(totalRecords / BATCH_SIZE)
  const results: T[] = []

  for (let batchStart = 0; batchStart < numBatches; batchStart += MAX_CONCURRENT) {
    const batchPromises = []

    for (let i = batchStart; i < Math.min(batchStart + MAX_CONCURRENT, numBatches); i++) {
      const offset = i * BATCH_SIZE

      let query = supabaseClient
        .from('ai_human_comparison')
        .select(selectFields)
        .in('request_subtype', categories)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString())
        .range(offset, offset + BATCH_SIZE - 1)

      // Only filter by email if specific agents are provided
      if (emailFilter.length > 0) {
        query = query.in('email', emailFilter)
      }

      if (versions.length > 0) {
        query = query.in('prompt_version', versions)
      }

      const promise = query.then(({ data, error }) => {
        if (error) throw error
        return (data || []) as T[]
      })

      batchPromises.push(promise)
    }

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults.flat())

    // Small delay between batch groups to avoid rate limiting
    if (batchStart + MAX_CONCURRENT < numBatches) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  return results
}

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
 * Uses batched fetching to bypass Supabase's 1000 record limit
 */
export async function getCategoryKPIData(
  categories: string[],
  filters: CategoryFilters
): Promise<CategoryKPIData> {
  const { dateRange, versions, agents } = filters
  const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

  // Select only necessary fields
  const selectFields = 'changed'

  type KPIRecord = { changed: boolean }

  // Fetch all records using batched approach
  // Pass agents directly - empty array means no email filter (all agents)
  const [currentRecords, previousRecords] = await Promise.all([
    fetchAllForCategory<KPIRecord>(
      supabase,
      selectFields,
      categories,
      dateRange.from,
      dateRange.to,
      agents,
      versions
    ),
    fetchAllForCategory<KPIRecord>(
      supabase,
      selectFields,
      categories,
      previousPeriod.from,
      previousPeriod.to,
      agents,
      versions
    ),
  ])

  // Calculate metrics from all records
  const currentTotal = currentRecords.length
  const previousTotal = previousRecords.length

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
 * Uses batched fetching to bypass Supabase's 1000 record limit
 */
export async function getCategoryWeeklyTrends(
  categories: string[],
  filters: CategoryFilters
): Promise<CategoryWeeklyTrend[]> {
  const { dateRange, versions, agents } = filters

  type WeekRecord = { created_at: string; changed: boolean }

  // Fetch all records using batched approach
  // Pass agents directly - empty array means no email filter (all agents)
  const records = await fetchAllForCategory<WeekRecord>(
    supabase,
    'created_at, changed',
    categories,
    dateRange.from,
    dateRange.to,
    agents,
    versions
  )

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
 * Uses batched fetching to bypass Supabase's 1000 record limit
 */
export async function getCategoryVersionStats(
  categories: string[],
  filters: CategoryFilters
): Promise<CategoryVersionStats[]> {
  const { dateRange, versions, agents } = filters

  type VersionRecord = { prompt_version: string | null; changed: boolean }

  // Fetch all records using batched approach
  // Pass agents directly - empty array means no email filter (all agents)
  const records = await fetchAllForCategory<VersionRecord>(
    supabase,
    'prompt_version, changed',
    categories,
    dateRange.from,
    dateRange.to,
    agents,
    versions
  )

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
 * Uses batched fetching to bypass Supabase's 1000 record limit
 */
export async function getCategoryAgentStats(
  categories: string[],
  filters: CategoryFilters
): Promise<CategoryAgentStats[]> {
  const { dateRange, versions, agents } = filters

  type AgentRecord = { email: string | null; changed: boolean }

  // Fetch all records using batched approach
  // Pass agents directly - empty array means no email filter (all agents)
  const records = await fetchAllForCategory<AgentRecord>(
    supabase,
    'email, changed',
    categories,
    dateRange.from,
    dateRange.to,
    agents,
    versions
  )

  // Group by agent
  const agentMap = new Map<string, { total: number; good: number; changed: number }>()

  records.forEach((record) => {
    // Skip records without email - they don't have agent attribution
    if (!record.email) return

    const agent = record.email

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

  // Build query
  let query = supabase
    .from('ai_human_comparison')
    .select('id, ticket_id, prompt_version, created_at, email, changed, change_classification', { count: 'exact' })
    .in('request_subtype', categories)
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  // Only filter by agents if specific agents are provided
  if (agents.length > 0) {
    query = query.in('email', agents)
  }

  if (versions.length > 0) {
    query = query.in('prompt_version', versions)
  }

  const { data, count, error } = await query

  if (error || !data) {
    throw new Error('Failed to fetch category records')
  }

  type RecordRow = {
    id: number
    ticket_id: string | null
    prompt_version: string | null
    created_at: string
    email: string | null
    changed: boolean
    change_classification: string | null
  }

  const records = (data as unknown as RecordRow[]).map((record) => {
    const date = new Date(record.created_at)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })

    return {
      id: record.id,
      ticketId: record.ticket_id,
      version: record.prompt_version || 'unknown',
      week: format(weekStart, 'MMM dd'), // e.g., "Dec 09" instead of "Week 50"
      weekStart: weekStart.toISOString(),
      agent: record.email || '-', // Show dash instead of "unknown" for missing email
      changed: record.changed,
      changeClassification: record.change_classification,
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
