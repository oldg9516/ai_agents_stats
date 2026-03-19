/**
 * Eval Dashboard Database Queries (Drizzle)
 *
 * Primary source: eval_results
 * Fields: id, request_subtype, request_sub_subtype, created_at,
 *         decision, auto_send_enabled, checks (JSONB), diagnostics (JSONB), overrides (JSONB)
 *
 * JS-side aggregation: single fetch + grouping by (request_subtype, request_sub_subtype)
 * No batch fetching needed — direct pg has no row limit.
 */

import { db } from './index'
import { and, gte, lt, eq, isNull, inArray } from 'drizzle-orm'
import { evalResults } from './schema'

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
	filters: EvalFilters
): Promise<EvalIntentRow[]> {
	const { dateRange, categories } = filters

	// Build conditions
	const conditions = [
		gte(evalResults.createdAt, dateRange.from),
		lt(evalResults.createdAt, dateRange.to),
	]

	if (categories.length > 0) {
		conditions.push(inArray(evalResults.requestSubtype, categories))
	}

	// Single query — no batch fetching needed
	const records = await db
		.select({
			requestSubtype: evalResults.requestSubtype,
			requestSubSubtype: evalResults.requestSubSubtype,
			decision: evalResults.decision,
			autoSendEnabled: evalResults.autoSendEnabled,
			checks: evalResults.checks,
			diagnostics: evalResults.diagnostics,
		})
		.from(evalResults)
		.where(and(...conditions))

	if (records.length === 0) return []

	// Group by intent and compute metrics
	const intentMap = new Map<
		string,
		{
			requestSubtype: string
			requestSubSubtype: string | null
			total: number
			criticalErrors: number
			safeToSend: number
			systemActionBlocked: number
			lastAutoSendEnabled: boolean
		}
	>()

	for (const record of records) {
		const subtype = record.requestSubtype ?? 'Unknown'
		const subSubtype = record.requestSubSubtype ?? null
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

		// Parse checks JSONB (pg returns JSONB as parsed objects)
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
		if (
			diagnostics &&
			diagnostics.failure_origin === 'system_action_required'
		) {
			entry.systemActionBlocked++
		}

		// Auto-send enabled (take last value)
		entry.lastAutoSendEnabled = record.autoSendEnabled ?? false
	}

	// Build rows
	const rows: EvalIntentRow[] = []
	for (const [intentKey, entry] of intentMap) {
		const criticalErrorRate =
			entry.total > 0 ? (entry.criticalErrors / entry.total) * 100 : 0
		const safeToSendRate =
			entry.total > 0 ? (entry.safeToSend / entry.total) * 100 : 0
		const systemActionBlockRate =
			entry.total > 0
				? (entry.systemActionBlocked / entry.total) * 100
				: 0

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
			systemActionBlockRate:
				Math.round(systemActionBlockRate * 10) / 10,
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
	filters: EvalFilters,
	requestSubtype: string,
	requestSubSubtype: string | null
): Promise<EvalIntentDiagnostics | null> {
	const conditions = [
		eq(evalResults.requestSubtype, requestSubtype),
		gte(evalResults.createdAt, filters.dateRange.from),
		lt(evalResults.createdAt, filters.dateRange.to),
	]

	if (requestSubSubtype) {
		conditions.push(
			eq(evalResults.requestSubSubtype, requestSubSubtype)
		)
	} else {
		conditions.push(isNull(evalResults.requestSubSubtype))
	}

	const data = await db
		.select({
			diagnostics: evalResults.diagnostics,
			overrides: evalResults.overrides,
			checks: evalResults.checks,
			decision: evalResults.decision,
		})
		.from(evalResults)
		.where(and(...conditions))

	if (data.length === 0) return null

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
			incrementMap(
				failureOriginMap,
				diagnostics.failure_origin ?? 'unknown'
			)
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function mapToDistribution(
	map: Map<string, number>,
	total: number
): DistributionEntry[] {
	return Array.from(map.entries())
		.map(([value, count]) => ({
			value,
			count,
			percent:
				total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
		}))
		.sort((a, b) => b.count - a.count)
}
