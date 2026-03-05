/**
 * Eval Dashboard Database Queries
 *
 * Primary source: eval_results
 * Fields: id, request_subtype, request_sub_subtype, created_at,
 *         decision, auto_send_enabled, checks (JSONB), diagnostics (JSONB), overrides (JSONB)
 *
 * JS-side aggregation: batch-fetch + grouping by (request_subtype, request_sub_subtype)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const BATCH_SIZE = 1000

// ============================================================================
// Types
// ============================================================================

export interface EvalFilters {
	dateRange: {
		from: Date
		to: Date
	}
	categories: string[] // request_subtype - [] = all
}

export type EvalIntentStatus = 'READY' | 'REVIEW' | 'NOT_READY'

export interface EvalIntentRow {
	intentId: string // "request_subtype::request_sub_subtype"
	requestSubtype: string
	requestSubSubtype: string | null
	totalTickets: number
	criticalErrorRate: number // percentage
	safeToSendRate: number // percentage
	systemActionBlockRate: number // percentage
	autoSendEnabled: boolean
	status: EvalIntentStatus
}

export interface EvalIntentDiagnostics {
	intentId: string
	requestSubtype: string
	requestSubSubtype: string | null
	totalRecords: number
	failureOrigin: DistributionEntry[]
	errorShape: DistributionEntry[]
	fixability: DistributionEntry[]
	confidence: DistributionEntry[]
	overrideDetails: {
		total: number
		signalCount: number
		followedCount: number
		overriddenCount: number
	}
}

export interface DistributionEntry {
	value: string
	count: number
	percent: number
}

// ============================================================================
// Intent Table Query (PRIMARY view)
// ============================================================================

/**
 * Fetch eval results, group by intent, compute readiness metrics
 */
export async function fetchEvalIntentTable(
	supabase: SupabaseClient,
	filters: EvalFilters
): Promise<EvalIntentRow[]> {
	const { dateRange, categories } = filters

	// Step 1: Count records
	let countQuery = (supabase as any)
		.from('eval_results')
		.select('id', { count: 'exact', head: true })
		.gte('created_at', dateRange.from.toISOString())
		.lt('created_at', dateRange.to.toISOString())

	if (categories.length > 0) countQuery = countQuery.in('request_subtype', categories)

	const { count, error: countError } = await countQuery
	if (countError) throw countError

	const totalRecords = count ?? 0
	if (totalRecords === 0) return []

	// Step 2: Fetch records in batches
	const records: any[] = []
	const numBatches = Math.ceil(totalRecords / BATCH_SIZE)

	for (let i = 0; i < numBatches; i++) {
		let batchQuery = (supabase as any)
			.from('eval_results')
			.select('request_subtype, request_sub_subtype, decision, auto_send_enabled, checks, diagnostics')
			.gte('created_at', dateRange.from.toISOString())
			.lt('created_at', dateRange.to.toISOString())
			.range(i * BATCH_SIZE, (i + 1) * BATCH_SIZE - 1)

		if (categories.length > 0) batchQuery = batchQuery.in('request_subtype', categories)

		const { data: batchData, error: batchError } = await batchQuery
		if (batchError) throw batchError
		if (batchData) records.push(...batchData)
	}

	if (records.length === 0) return []

	// Step 3: Group by intent and compute metrics
	const intentMap = new Map<string, {
		requestSubtype: string
		requestSubSubtype: string | null
		total: number
		criticalErrors: number
		safeToSend: number
		systemActionBlocked: number
		lastAutoSendEnabled: boolean
	}>()

	for (const record of records) {
		const subtype = record.request_subtype ?? 'Unknown'
		const subSubtype = record.request_sub_subtype ?? null
		const intentKey = `${subtype}::${subSubtype ?? ''}`

		let entry = intentMap.get(intentKey)
		if (!entry) {
			entry = {
				requestSubtype: subtype,
				requestSubSubtype: subSubtype,
				total: 0,
				criticalErrors: 0,
				safeToSend: 0,
				systemActionBlocked: 0,
				lastAutoSendEnabled: false,
			}
			intentMap.set(intentKey, entry)
		}

		entry.total++

		// Parse checks JSONB
		const checks = parseJsonField(record.checks)
		if (checks) {
			const isCritical =
				checks.red_lines === 'fail' ||
				checks.no_false_promises === 'fail' ||
				checks.data_consistency === 'fail'
			if (isCritical) entry.criticalErrors++
		}

		// Decision
		if (record.decision === 'send') entry.safeToSend++

		// Parse diagnostics JSONB
		const diagnostics = parseJsonField(record.diagnostics)
		if (diagnostics && diagnostics.failure_origin === 'system_action_required') {
			entry.systemActionBlocked++
		}

		// Auto-send enabled (take last value)
		entry.lastAutoSendEnabled = record.auto_send_enabled ?? false
	}

	// Step 4: Build rows
	const rows: EvalIntentRow[] = []
	for (const [intentKey, entry] of intentMap) {
		const criticalErrorRate = entry.total > 0 ? (entry.criticalErrors / entry.total) * 100 : 0
		const safeToSendRate = entry.total > 0 ? (entry.safeToSend / entry.total) * 100 : 0
		const systemActionBlockRate = entry.total > 0 ? (entry.systemActionBlocked / entry.total) * 100 : 0

		let status: EvalIntentStatus = 'NOT_READY'
		if (criticalErrorRate === 0 && safeToSendRate >= 70) {
			status = 'READY'
		} else if (criticalErrorRate === 0 && safeToSendRate >= 30) {
			status = 'REVIEW'
		}

		rows.push({
			intentId: intentKey,
			requestSubtype: entry.requestSubtype,
			requestSubSubtype: entry.requestSubSubtype,
			totalTickets: entry.total,
			criticalErrorRate: Math.round(criticalErrorRate * 10) / 10,
			safeToSendRate: Math.round(safeToSendRate * 10) / 10,
			systemActionBlockRate: Math.round(systemActionBlockRate * 10) / 10,
			autoSendEnabled: entry.lastAutoSendEnabled,
			status,
		})
	}

	return rows.sort((a, b) => b.totalTickets - a.totalTickets)
}

// ============================================================================
// Intent Diagnostics Query (SECONDARY view)
// ============================================================================

/**
 * Fetch diagnostics for a specific intent
 */
export async function fetchEvalIntentDiagnostics(
	supabase: SupabaseClient,
	filters: EvalFilters,
	requestSubtype: string,
	requestSubSubtype: string | null
): Promise<EvalIntentDiagnostics | null> {
	let query = (supabase as any)
		.from('eval_results')
		.select('diagnostics, overrides, checks, decision')
		.eq('request_subtype', requestSubtype)
		.gte('created_at', filters.dateRange.from.toISOString())
		.lt('created_at', filters.dateRange.to.toISOString())

	if (requestSubSubtype) {
		query = query.eq('request_sub_subtype', requestSubSubtype)
	} else {
		query = query.is('request_sub_subtype', null)
	}

	const { data, error } = await query
	if (error) throw error
	if (!data || data.length === 0) return null

	const failureOriginMap = new Map<string, number>()
	const errorShapeMap = new Map<string, number>()
	const fixabilityMap = new Map<string, number>()
	const confidenceMap = new Map<string, number>()
	let overrideTotal = 0
	let signalCount = 0
	let followedCount = 0
	let overriddenCount = 0

	for (const record of data) {
		const diagnostics = parseJsonField(record.diagnostics)
		if (diagnostics) {
			incrementMap(failureOriginMap, diagnostics.failure_origin ?? 'unknown')
			incrementMap(errorShapeMap, diagnostics.error_shape ?? 'unknown')
			incrementMap(fixabilityMap, diagnostics.fixability ?? 'unknown')
			incrementMap(confidenceMap, diagnostics.confidence ?? 'unknown')
		}

		const overrides = parseJsonField(record.overrides)
		if (overrides) {
			overrideTotal++
			if (overrides.signal) signalCount++
			if (overrides.followed) followedCount++
			if (overrides.overridden) overriddenCount++
		}
	}

	const total = data.length
	const intentId = `${requestSubtype}::${requestSubSubtype ?? ''}`

	return {
		intentId,
		requestSubtype,
		requestSubSubtype,
		totalRecords: total,
		failureOrigin: mapToDistribution(failureOriginMap, total),
		errorShape: mapToDistribution(errorShapeMap, total),
		fixability: mapToDistribution(fixabilityMap, total),
		confidence: mapToDistribution(confidenceMap, total),
		overrideDetails: {
			total: overrideTotal,
			signalCount,
			followedCount,
			overriddenCount,
		},
	}
}

// ============================================================================
// Helpers
// ============================================================================

function parseJsonField(value: unknown): any {
	if (!value) return null
	try {
		return typeof value === 'string' ? JSON.parse(value) : value
	} catch {
		return null
	}
}

function incrementMap(map: Map<string, number>, key: string) {
	map.set(key, (map.get(key) ?? 0) + 1)
}

function mapToDistribution(map: Map<string, number>, total: number): DistributionEntry[] {
	return Array.from(map.entries())
		.map(([value, count]) => ({
			value,
			count,
			percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
		}))
		.sort((a, b) => b.count - a.count)
}
