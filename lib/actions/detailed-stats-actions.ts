'use server'

/**
 * Detailed Stats Server Actions (TypeScript Aggregation)
 *
 * This is the TypeScript-based implementation that replaces the SQL RPC function
 * `get_detailed_stats_paginated`. It fetches raw data and performs aggregation
 * in TypeScript for better maintainability and testability.
 *
 * Migration from SQL RPC: See MIGRATION-PLAN.md for details
 */

import { supabaseServer } from '@/lib/supabase/server'
import type { DashboardFilters, DateFilterMode, DetailedStatsRow } from '@/lib/supabase/types'
import {
	isAiErrorClassification,
	isAiQualityClassification,
	isQualityRecord,
	isErrorRecord,
	LEGACY_CLASSIFICATION_TYPES,
	NEW_CLASSIFICATION_TYPES,
	CLASSIFICATION_TYPES,
	type LegacyClassificationType,
	type NewClassificationType,
} from '@/constants/classification-types'

// =============================================================================
// TYPES
// =============================================================================

type RawRecord = {
	created_at: string | null
	human_reply_date: string | null
	request_subtype: string | null
	prompt_version: string | null
	change_classification: string | null
	human_reply: string | null
	ticket_id: string | null
	ai_approved: boolean | null
	thread_id: string | null
}

// Extended filters type that includes includedThreadIds (whitelist for showOnlyRequiresEditing)
type ExtendedDashboardFilters = DashboardFilters & { includedThreadIds?: string[] }

type DialogRecord = {
	ticket_id: string
	direction: string
	date: string
}

type PaginatedResult = {
	data: DetailedStatsRow[]
	totalCount: number
	totalPages: number
	currentPage: number
	hasNextPage: boolean
	hasPreviousPage: boolean
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BATCH_SIZE = 1000
const MAX_CONCURRENT_BATCHES = 3
const DIALOG_BATCH_SIZE = 300

// =============================================================================
// DIALOG PATTERNS DETECTION (Second Request + Not Responded)
// =============================================================================

/**
 * Fetch dialogs for ticket IDs and analyze patterns
 * Returns both:
 * - secondRequestTicketIds: tickets with >1 incoming messages without outgoing between them
 * - notRespondedTicketIds: tickets where the last incoming message has no outgoing response after it
 *
 * @param ticketIds - List of ticket IDs to check
 * @returns Object with both sets of ticket IDs
 */
async function fetchDialogPatterns(
	ticketIds: string[]
): Promise<{ secondRequestTicketIds: Set<string>; notRespondedTicketIds: Set<string> }> {
	const emptyResult = { secondRequestTicketIds: new Set<string>(), notRespondedTicketIds: new Set<string>() }

	if (ticketIds.length === 0) return emptyResult

	const uniqueTicketIds = [...new Set(ticketIds.filter(Boolean))]
	if (uniqueTicketIds.length === 0) return emptyResult

	// Fetch dialogs in batches
	const allDialogs: DialogRecord[] = []
	const batches = Math.ceil(uniqueTicketIds.length / DIALOG_BATCH_SIZE)

	for (let i = 0; i < batches; i += MAX_CONCURRENT_BATCHES) {
		const batchPromises: Promise<DialogRecord[]>[] = []

		for (let j = i; j < Math.min(i + MAX_CONCURRENT_BATCHES, batches); j++) {
			const startIdx = j * DIALOG_BATCH_SIZE
			const batchTicketIds = uniqueTicketIds.slice(startIdx, startIdx + DIALOG_BATCH_SIZE)

			const promise = (async () => {
				const { data, error } = await supabaseServer
					.from('support_dialogs')
					.select('ticket_id, direction, date')
					.in('ticket_id', batchTicketIds)

				if (error) {
					console.error('[DialogPatterns] Error fetching dialogs:', error)
					return []
				}

				return (data || []) as DialogRecord[]
			})()

			batchPromises.push(promise)
		}

		const results = await Promise.all(batchPromises)
		allDialogs.push(...results.flat())

		// Small delay between batch groups
		if (i + MAX_CONCURRENT_BATCHES < batches) {
			await new Promise(resolve => setTimeout(resolve, 50))
		}
	}

	if (allDialogs.length === 0) return emptyResult

	// Group dialogs by ticket_id
	const dialogsByTicket = new Map<string, DialogRecord[]>()
	for (const dialog of allDialogs) {
		if (!dialog.ticket_id) continue
		const existing = dialogsByTicket.get(dialog.ticket_id) || []
		existing.push(dialog)
		dialogsByTicket.set(dialog.ticket_id, existing)
	}

	// Analyze patterns for each ticket
	const secondRequestTicketIds = new Set<string>()
	const notRespondedTicketIds = new Set<string>()

	for (const [ticketId, ticketDialogs] of dialogsByTicket) {
		// Sort by date
		const sorted = ticketDialogs.sort((a, b) =>
			new Date(a.date).getTime() - new Date(b.date).getTime()
		)

		let lastIncoming: DialogRecord | null = null
		let hasSecondRequest = false

		for (const dialog of sorted) {
			if (dialog.direction === 'in') {
				if (lastIncoming !== null && !hasSecondRequest) {
					// Found second incoming without outgoing between them!
					secondRequestTicketIds.add(ticketId)
					hasSecondRequest = true
				}
				lastIncoming = dialog
			} else if (dialog.direction === 'out') {
				lastIncoming = null // Reset - agent responded
			}
		}

		// After processing all dialogs, if lastIncoming is not null,
		// it means the last incoming message was never responded to
		if (lastIncoming !== null) {
			notRespondedTicketIds.add(ticketId)
		}
	}

	return { secondRequestTicketIds, notRespondedTicketIds }
}

/**
 * Legacy wrapper for backward compatibility
 * @deprecated Use fetchDialogPatterns instead
 */
async function fetchSecondRequestTicketIds(
	ticketIds: string[]
): Promise<Set<string>> {
	const { secondRequestTicketIds } = await fetchDialogPatterns(ticketIds)
	return secondRequestTicketIds
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Fetch detailed stats with TypeScript aggregation
 * Replaces SQL function: get_detailed_stats_paginated
 *
 * @param filters - Dashboard filters (with optional includedThreadIds for showOnlyRequiresEditing)
 * @param mergeMultiCategories - If true, merge categories containing commas into "Multi-category"
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function fetchDetailedStatsTS(
	filters: ExtendedDashboardFilters,
	mergeMultiCategories: boolean = false,
	dateFilterMode: DateFilterMode = 'created'
): Promise<PaginatedResult> {
	const startTime = performance.now()

	try {
		// Step 1: Get total count
		const totalRecords = await getTotalCount(filters, dateFilterMode)
		console.log(
			`[DetailedStats TS] Total records to fetch: ${totalRecords} (mode: ${dateFilterMode})`
		)

		if (totalRecords === 0) {
			return emptyResult()
		}

		// Step 2: Fetch in batches
		const records = await fetchInBatches(filters, totalRecords, dateFilterMode)
		console.log(
			`[DetailedStats TS] Fetched ${records.length} records in ${(performance.now() - startTime).toFixed(0)}ms`
		)

		// Step 2.5: Fetch second request ticket IDs from support_dialogs
		const ticketIds = records.map(r => r.ticket_id).filter(Boolean) as string[]
		const dialogPatternsStart = performance.now()
		const secondRequestTicketIds = await fetchSecondRequestTicketIds(ticketIds)
		console.log(
			`[DetailedStats TS] Found ${secondRequestTicketIds.size} second request tickets in ${(performance.now() - dialogPatternsStart).toFixed(0)}ms`
		)

		// Step 3: Aggregate in TypeScript
		const aggregateStart = performance.now()
		const rows = aggregateDetailedStats(records, mergeMultiCategories, dateFilterMode, secondRequestTicketIds)
		console.log(
			`[DetailedStats TS] Aggregated to ${rows.length} rows in ${(performance.now() - aggregateStart).toFixed(0)}ms`
		)

		// Step 4: Sort results
		const sortedRows = sortDetailedStats(rows)

		console.log(
			`[DetailedStats TS] Total time: ${(performance.now() - startTime).toFixed(0)}ms`
		)

		return {
			data: sortedRows,
			totalCount: sortedRows.length,
			totalPages: 1, // All data returned, pagination is client-side
			currentPage: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		}
	} catch (error) {
		console.error('[DetailedStats TS] Error:', error)
		throw error
	}
}

/**
 * Wrapper server action for DetailedStatsTable
 * Handles requires_editing filter by fetching includedThreadIds
 *
 * @param filters - Dashboard filters
 * @param mergeMultiCategories - If true, merge categories containing commas into "Multi-category"
 * @param dateFilterMode - Date field to filter by ('created' or 'human_reply')
 */
export async function fetchDetailedStatsWithFilter(
	filters: DashboardFilters,
	mergeMultiCategories: boolean = false,
	dateFilterMode: DateFilterMode = 'created'
): Promise<PaginatedResult> {
	// Get show filters with defaults (both true = show all)
	const showNeedEdit = filters.showNeedEdit ?? true
	const showNotNeedEdit = filters.showNotNeedEdit ?? true

	// Determine if we need to filter by requires_editing
	let includedThreadIds: string[] | undefined = undefined

	// Both false - return empty result
	if (!showNeedEdit && !showNotNeedEdit) {
		return emptyResult()
	}

	// If not both true, we need to filter
	if (!(showNeedEdit && showNotNeedEdit)) {
		const { fetchFilteredThreadIds } = await import('@/lib/supabase/helpers')
		const result = await fetchFilteredThreadIds(supabaseServer, showNeedEdit, showNotNeedEdit)
		if (result !== null) {
			includedThreadIds = result
		}
	}

	// Legacy support: if hideRequiresEditing is set and new filters are not used
	if (filters.hideRequiresEditing && showNeedEdit && showNotNeedEdit) {
		const { fetchRequiresEditingThreadIds } = await import('@/lib/supabase/helpers')
		includedThreadIds = await fetchRequiresEditingThreadIds(supabaseServer)
	}

	// Create extended filters with includedThreadIds
	const extendedFilters: ExtendedDashboardFilters = {
		...filters,
		includedThreadIds: includedThreadIds && includedThreadIds.length > 0 ? includedThreadIds : undefined,
	}

	return fetchDetailedStatsTS(extendedFilters, mergeMultiCategories, dateFilterMode)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function emptyResult(): PaginatedResult {
	return {
		data: [],
		totalCount: 0,
		totalPages: 0,
		currentPage: 0,
		hasNextPage: false,
		hasPreviousPage: false,
	}
}

/**
 * Get total count of records matching filters
 */
async function getTotalCount(
	filters: ExtendedDashboardFilters,
	dateFilterMode: DateFilterMode
): Promise<number> {
	const { dateRange, versions, categories, agents, includedThreadIds } = filters
	const dateField = dateFilterMode === 'human_reply' ? 'human_reply_date' : 'created_at'

	// Using 'id' instead of '*' for better performance
	let query = supabaseServer
		.from('ai_human_comparison')
		.select('id', { count: 'exact', head: true })
		.gte(dateField, dateRange.from.toISOString())
		.lt(dateField, dateRange.to.toISOString())

	// For human_reply mode, also filter out records with no human_reply_date
	if (dateFilterMode === 'human_reply') {
		query = query.not('human_reply_date', 'is', null)
	}

	if (versions.length > 0) query = query.in('prompt_version', versions)
	if (categories.length > 0) query = query.in('request_subtype', categories)
	if (agents.length > 0) query = query.in('email', agents)

	// Exclude system/API emails from statistics
	query = query.neq('email', 'api@levhaolam.com')
	query = query.neq('email', 'samantha@levhaolam.com')

	// INCLUDE ONLY thread_ids where requires_editing = true (showOnlyRequiresEditing filter)
	// Only apply for small arrays to avoid query size limits
	if (includedThreadIds && includedThreadIds.length > 0 && includedThreadIds.length <= 100) {
		query = query.in('thread_id', includedThreadIds)
	}

	const { count, error } = await query

	if (error) throw new Error(`Count query failed: ${error.message}`)
	return count || 0
}

/**
 * Fetch records in batches to bypass Supabase limits
 */
async function fetchInBatches(
	filters: ExtendedDashboardFilters,
	totalRecords: number,
	dateFilterMode: DateFilterMode
): Promise<RawRecord[]> {
	const { dateRange, versions, categories, agents, includedThreadIds } = filters
	const dateField = dateFilterMode === 'human_reply' ? 'human_reply_date' : 'created_at'
	const batches = Math.ceil(totalRecords / BATCH_SIZE)
	const allRecords: RawRecord[] = []

	// Process batches in groups of MAX_CONCURRENT_BATCHES
	for (let i = 0; i < batches; i += MAX_CONCURRENT_BATCHES) {
		const batchPromises = []

		for (let j = i; j < Math.min(i + MAX_CONCURRENT_BATCHES, batches); j++) {
			const offset = j * BATCH_SIZE

			let query = supabaseServer
				.from('ai_human_comparison')
				.select(
					'thread_id, created_at, human_reply_date, request_subtype, prompt_version, change_classification, human_reply, ticket_id, ai_approved'
				)
				.gte(dateField, dateRange.from.toISOString())
				.lt(dateField, dateRange.to.toISOString())
				.range(offset, offset + BATCH_SIZE - 1)

			// For human_reply mode, also filter out records with no human_reply_date
			if (dateFilterMode === 'human_reply') {
				query = query.not('human_reply_date', 'is', null)
			}

			if (versions.length > 0) query = query.in('prompt_version', versions)
			if (categories.length > 0) query = query.in('request_subtype', categories)
			if (agents.length > 0) query = query.in('email', agents)

			// Exclude system/API emails from statistics
			query = query.neq('email', 'api@levhaolam.com')
			query = query.neq('email', 'samantha@levhaolam.com')

			// INCLUDE ONLY thread_ids where requires_editing = true (showOnlyRequiresEditing filter)
			// Only apply for small arrays to avoid query size limits
			if (includedThreadIds && includedThreadIds.length > 0 && includedThreadIds.length <= 100) {
				query = query.in('thread_id', includedThreadIds)
			}

			batchPromises.push(query)
		}

		const results = await Promise.all(batchPromises)

		for (const { data, error } of results) {
			if (error) throw new Error(`Batch fetch failed: ${error.message}`)
			if (data) allRecords.push(...(data as RawRecord[]))
		}
	}

	// For large included arrays (> 100), filter client-side
	if (includedThreadIds && includedThreadIds.length > 100) {
		const includedSet = new Set(includedThreadIds)
		return allRecords.filter(r => r.thread_id && includedSet.has(r.thread_id))
	}

	return allRecords
}

/**
 * Normalize category name based on merge mode
 * If mergeMultiCategories is true, categories containing commas are grouped as "Multi-category"
 */
function normalizeCategory(
	category: string,
	mergeMultiCategories: boolean
): string {
	if (mergeMultiCategories && category.includes(',')) {
		return 'Multi-category'
	}
	return category
}

/**
 * Count not responded records (human_reply IS NULL)
 */
function countNotResponded(records: RawRecord[]): number {
	return records.filter(r => r.human_reply === null).length
}

/**
 * Count second request records (ticket_id is in the secondRequestTicketIds set)
 */
function countSecondRequest(
	records: RawRecord[],
	secondRequestTicketIds: Set<string>
): number {
	return records.filter(r =>
		r.ticket_id !== null && secondRequestTicketIds.has(r.ticket_id)
	).length
}

/**
 * Aggregate records into detailed stats rows
 * This replaces the SQL CTE logic
 *
 * @param records - Raw records from database
 * @param mergeMultiCategories - If true, merge categories with commas into "Multi-category"
 * @param dateFilterMode - Date field to use for week grouping
 * @param secondRequestTicketIds - Set of ticket IDs that have second request pattern
 */
function aggregateDetailedStats(
	records: RawRecord[],
	mergeMultiCategories: boolean,
	dateFilterMode: DateFilterMode = 'created',
	secondRequestTicketIds: Set<string> = new Set()
): DetailedStatsRow[] {
	const rows: DetailedStatsRow[] = []

	// Group by category + version (Level 1)
	const versionGroups = new Map<
		string,
		{
			category: string
			version: string
			records: RawRecord[]
		}
	>()

	for (const record of records) {
		const rawCategory = record.request_subtype ?? 'unknown'
		const category = normalizeCategory(rawCategory, mergeMultiCategories)
		const version = record.prompt_version ?? 'unknown'
		const key = `${category}|${version}`

		if (!versionGroups.has(key)) {
			versionGroups.set(key, { category, version, records: [] })
		}
		versionGroups.get(key)!.records.push(record)
	}

	// Process each version group
	for (const group of versionGroups.values()) {
		const classifications = countAllClassifications(group.records)
		// reviewedRecords = records with known classification OR ai_approved = true
		const reviewedRecords = group.records.filter(
			r => r.ai_approved === true || isKnownClassification(r.change_classification)
		)

		// Level 1: Version-level row
		rows.push({
			category: group.category,
			version: group.version,
			dates: null,
			sortOrder: 1,
			totalRecords: group.records.length,
			reviewedRecords: reviewedRecords.length,
			aiErrors: countAiErrors(reviewedRecords),
			aiQuality: countAiQuality(reviewedRecords),
			notResponded: countNotResponded(group.records),
			secondRequest: countSecondRequest(group.records, secondRequestTicketIds),
			aiApprovedCount: countAiApproved(reviewedRecords),
			unclassifiedCount: countUnclassified(group.records),
			...classifications,
		})

		// Level 2: Week-level rows
		const weekGroups = new Map<string, RawRecord[]>()

		for (const record of group.records) {
			// Use appropriate date field based on mode
			const dateValue = dateFilterMode === 'human_reply'
				? record.human_reply_date
				: record.created_at
			const weekStart = getWeekStart(
				new Date(dateValue ?? new Date())
			)
			if (!weekGroups.has(weekStart)) {
				weekGroups.set(weekStart, [])
			}
			weekGroups.get(weekStart)!.push(record)
		}

		for (const [weekStart, weekRecords] of weekGroups) {
			const weekClassifications = countAllClassifications(weekRecords)
			// weekReviewedRecords = records with known classification OR ai_approved = true
			const weekReviewedRecords = weekRecords.filter(
				r => r.ai_approved === true || isKnownClassification(r.change_classification)
			)

			const weekStartDate = new Date(weekStart)
			const weekEndDate = new Date(weekStartDate)
			weekEndDate.setDate(weekEndDate.getDate() + 6)

			rows.push({
				category: group.category,
				version: group.version,
				dates: `${formatDate(weekStartDate)} — ${formatDate(weekEndDate)}`,
				sortOrder: 2,
				totalRecords: weekRecords.length,
				reviewedRecords: weekReviewedRecords.length,
				aiErrors: countAiErrors(weekReviewedRecords),
				aiQuality: countAiQuality(weekReviewedRecords),
				notResponded: countNotResponded(weekRecords),
				secondRequest: countSecondRequest(weekRecords, secondRequestTicketIds),
				aiApprovedCount: countAiApproved(weekReviewedRecords),
				unclassifiedCount: countUnclassified(weekRecords),
				...weekClassifications,
			})
		}
	}

	return rows
}

/**
 * Count AI errors
 * Uses ai_approved priority: ai_approved = true means NOT an error
 */
function countAiErrors(records: RawRecord[]): number {
	return records.filter(r =>
		isErrorRecord({
			ai_approved: r.ai_approved,
			change_classification: r.change_classification,
		})
	).length
}

/**
 * Count AI quality (good performance)
 * Uses ai_approved priority: ai_approved = true means quality
 */
function countAiQuality(records: RawRecord[]): number {
	return records.filter(r =>
		isQualityRecord({
			ai_approved: r.ai_approved,
			change_classification: r.change_classification,
		})
	).length
}

/**
 * Count records with ai_approved = true
 */
function countAiApproved(records: RawRecord[]): number {
	return records.filter(r => r.ai_approved === true).length
}

/**
 * Check if a classification is known (exists in LEGACY or NEW types)
 */
function isKnownClassification(classification: string | null): boolean {
	if (!classification) return false
	return CLASSIFICATION_TYPES.includes(classification as LegacyClassificationType | NewClassificationType)
}

/**
 * Count records with unknown/null/empty classification
 * (not ai_approved and not a known classification type)
 */
function countUnclassified(records: RawRecord[]): number {
	return records.filter(r =>
		r.ai_approved !== true && !isKnownClassification(r.change_classification)
	).length
}

/**
 * Count all classification types (legacy + new with bidirectional mapping)
 * EXCLUDES records with ai_approved = true (they go to aiApprovedCount instead)
 */
function countAllClassifications(records: RawRecord[]): Omit<
	DetailedStatsRow,
	| 'category'
	| 'version'
	| 'dates'
	| 'sortOrder'
	| 'totalRecords'
	| 'reviewedRecords'
	| 'aiErrors'
	| 'aiQuality'
	| 'notResponded'
	| 'secondRequest'
	| 'aiApprovedCount'
	| 'unclassifiedCount'
> {
	// Filter out ai_approved = true records (they are counted separately)
	const filteredRecords = records.filter(r => r.ai_approved !== true)
	// Legacy classifications
	const legacyCounts: Record<LegacyClassificationType, number> = {
		critical_error: 0,
		meaningful_improvement: 0,
		stylistic_preference: 0,
		no_significant_change: 0,
		context_shift: 0,
	}

	// New classifications
	const newCounts: Record<NewClassificationType, number> = {
		CRITICAL_FACT_ERROR: 0,
		MAJOR_FUNCTIONAL_OMISSION: 0,
		MINOR_INFO_GAP: 0,
		CONFUSING_VERBOSITY: 0,
		TONAL_MISALIGNMENT: 0,
		STRUCTURAL_FIX: 0,
		STYLISTIC_EDIT: 0,
		PERFECT_MATCH: 0,
		EXCL_WORKFLOW_SHIFT: 0,
		EXCL_DATA_DISCREPANCY: 0,
		HUMAN_INCOMPLETE: 0,
	}

	// Count each classification (only for records WITHOUT ai_approved = true)
	for (const record of filteredRecords) {
		const c = record.change_classification
		if (!c) continue

		if (LEGACY_CLASSIFICATION_TYPES.includes(c as LegacyClassificationType)) {
			legacyCounts[c as LegacyClassificationType]++
		}
		if (NEW_CLASSIFICATION_TYPES.includes(c as NewClassificationType)) {
			newCounts[c as NewClassificationType]++
		}
	}

	// Combine legacy + new for display (bidirectional mapping)
	return {
		// Legacy columns: combine legacy + mapped new
		criticalErrors:
			legacyCounts.critical_error +
			newCounts.CRITICAL_FACT_ERROR +
			newCounts.MAJOR_FUNCTIONAL_OMISSION,
		meaningfulImprovements:
			legacyCounts.meaningful_improvement +
			newCounts.MINOR_INFO_GAP +
			newCounts.CONFUSING_VERBOSITY +
			newCounts.TONAL_MISALIGNMENT,
		stylisticPreferences:
			legacyCounts.stylistic_preference +
			newCounts.STRUCTURAL_FIX +
			newCounts.STYLISTIC_EDIT,
		noSignificantChanges:
			legacyCounts.no_significant_change + newCounts.PERFECT_MATCH,
		contextShifts:
			legacyCounts.context_shift +
			newCounts.EXCL_WORKFLOW_SHIFT +
			newCounts.EXCL_DATA_DISCREPANCY +
			newCounts.HUMAN_INCOMPLETE,

		// New columns: combine new + mapped legacy
		criticalFactErrors:
			newCounts.CRITICAL_FACT_ERROR + legacyCounts.critical_error,
		majorFunctionalOmissions: newCounts.MAJOR_FUNCTIONAL_OMISSION,
		minorInfoGaps:
			newCounts.MINOR_INFO_GAP + legacyCounts.meaningful_improvement,
		confusingVerbosity: newCounts.CONFUSING_VERBOSITY,
		tonalMisalignments: newCounts.TONAL_MISALIGNMENT,
		structuralFixes: newCounts.STRUCTURAL_FIX,
		stylisticEdits:
			newCounts.STYLISTIC_EDIT + legacyCounts.stylistic_preference,
		perfectMatches:
			newCounts.PERFECT_MATCH + legacyCounts.no_significant_change,
		exclWorkflowShifts:
			newCounts.EXCL_WORKFLOW_SHIFT + legacyCounts.context_shift,
		exclDataDiscrepancies: newCounts.EXCL_DATA_DISCREPANCY,
		humanIncomplete: newCounts.HUMAN_INCOMPLETE,

		// Average score (not calculated yet)
		averageScore: null,
	}
}

/**
 * Sort detailed stats rows
 * Order: category ASC, version DESC (newest first), sortOrder ASC, dates DESC
 */
function sortDetailedStats(rows: DetailedStatsRow[]): DetailedStatsRow[] {
	return rows.sort((a, b) => {
		// 1. Category ascending
		if (a.category !== b.category) {
			return a.category.localeCompare(b.category)
		}

		// 2. Version descending (newest first)
		if (a.version !== b.version) {
			return extractVersionNumber(b.version) - extractVersionNumber(a.version)
		}

		// 3. Sort order (1 = version-level first, 2 = week-level)
		if (a.sortOrder !== b.sortOrder) {
			return a.sortOrder - b.sortOrder
		}

		// 4. Dates descending (newest first)
		if (a.dates && b.dates) {
			return compareDates(b.dates, a.dates)
		}

		return 0
	})
}

/**
 * Extract numeric version from version string (e.g., "v1" -> 1, "v2" -> 2)
 */
function extractVersionNumber(version: string): number {
	const match = version.match(/\d+/)
	return match ? parseInt(match[0]) : 0
}

/**
 * Compare date strings in DD.MM.YYYY — DD.MM.YYYY format
 */
function compareDates(dateStrA: string, dateStrB: string): number {
	const parseDate = (str: string): Date => {
		const [day, month, year] = str.split(' — ')[0].split('.')
		return new Date(`${year}-${month}-${day}`)
	}
	return parseDate(dateStrA).getTime() - parseDate(dateStrB).getTime()
}

/**
 * Get week start date (Monday) in ISO format
 */
function getWeekStart(date: Date): string {
	const d = new Date(date)
	const day = d.getDay()
	const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
	const monday = new Date(d.setDate(diff))
	monday.setHours(0, 0, 0, 0)
	return monday.toISOString()
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
