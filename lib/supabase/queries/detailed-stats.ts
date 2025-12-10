import { supabaseServer } from '../server'
import type { DashboardFilters, DetailedStatsRow } from '../types'
import {
	countClassifications,
	extractVersionNumber,
	formatDate,
	getWeekStart,
	isAiErrorClassification,
	isAiQualityClassification,
} from './utils'

// Use server-side Supabase client for all queries
const supabase = supabaseServer

/**
 * Type for detailed stats record (selected fields only)
 */
type DetailedStatsRecord = {
	created_at: string | null
	email: string | null
	changed: boolean
	request_subtype: string | null
	prompt_version: string | null
	change_classification: string | null
}

/**
 * Fetch Detailed Stats (for table)
 */
export async function getDetailedStats(
	filters: DashboardFilters
): Promise<DetailedStatsRow[]> {
	const { dateRange, versions, categories, agents } = filters

	// OPTIMIZATION: Select only fields needed for detailed stats calculation
	// This reduces data transfer significantly (6 fields instead of all)
	const selectFields =
		'created_at, email, changed, request_subtype, prompt_version, change_classification'

	let query = supabase
		.from('ai_human_comparison')
		.select(selectFields)
		.gte('created_at', dateRange.from.toISOString())
		.lte('created_at', dateRange.to.toISOString())

	if (versions.length > 0) {
		query = query.in('prompt_version', versions)
	}
	if (categories.length > 0) {
		query = query.in('request_subtype', categories)
	}
	if (agents && agents.length > 0) {
		query = query.in('email', agents)
	}

	// Increase limit to handle more records
	query = query.limit(50000)

	const { data, error } = await query

	if (error) throw error
	if (!data) return []

	const records = data as unknown as DetailedStatsRecord[]
	const rows: DetailedStatsRow[] = []

	// Group by category and version first (Level 1)
	const versionGroups = records.reduce((acc, record) => {
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
	}, {} as Record<string, { category: string; version: string; records: DetailedStatsRecord[] }>)

	// Process each version group
	Object.values(versionGroups).forEach(group => {
		// Use all records (no filtering by qualified agents)
		const allRecords = group.records
		const classifications = countClassifications(allRecords)

		// Reviewed records = records with classification (not null)
		const reviewedRecords = allRecords.filter(
			r => r.change_classification !== null
		)

		// AI Errors = critical + meaningful (legacy + new)
		const aiErrors = reviewedRecords.filter(r =>
			isAiErrorClassification(r.change_classification)
		).length

		// AI Quality = no_significant_change + stylistic_preference (legacy + new)
		const aiQuality = reviewedRecords.filter(r =>
			isAiQualityClassification(r.change_classification)
		).length

		// Level 1: Version-level row
		rows.push({
			category: group.category,
			version: group.version,
			dates: null,
			sortOrder: 1,
			totalRecords: allRecords.length,
			reviewedRecords: reviewedRecords.length,
			aiErrors,
			aiQuality,
			...classifications,
		})

		// Level 2: Week-level rows
		const weekGroups = group.records.reduce((acc, record) => {
			const weekStart = getWeekStart(new Date(record.created_at ?? new Date()))
			if (!acc[weekStart]) {
				acc[weekStart] = []
			}
			acc[weekStart].push(record)
			return acc
		}, {} as Record<string, DetailedStatsRecord[]>)

		Object.entries(weekGroups).forEach(([weekStart, weekRecords]) => {
			// Use all records (no filtering by qualified agents)
			const weekClassifications = countClassifications(weekRecords)

			// Reviewed records = records with classification (not null)
			const weekReviewedRecords = weekRecords.filter(
				r => r.change_classification !== null
			)

			// AI Errors = critical + meaningful (legacy + new)
			const weekAiErrors = weekReviewedRecords.filter(r =>
				isAiErrorClassification(r.change_classification)
			).length

			// AI Quality = no_significant_change + stylistic_preference (legacy + new)
			const weekAiQuality = weekReviewedRecords.filter(r =>
				isAiQualityClassification(r.change_classification)
			).length

			const weekStartDate = new Date(weekStart)
			const weekEndDate = new Date(weekStartDate)
			weekEndDate.setDate(weekEndDate.getDate() + 6)

			const dateRange = `${formatDate(weekStartDate)} — ${formatDate(
				weekEndDate
			)}`

			rows.push({
				category: group.category,
				version: group.version,
				dates: dateRange,
				sortOrder: 2,
				totalRecords: weekRecords.length,
				reviewedRecords: weekReviewedRecords.length,
				aiErrors: weekAiErrors,
				aiQuality: weekAiQuality,
				...weekClassifications,
			})
		})
	})

	// Sort: category ASC, sortOrder ASC, version DESC (newest first), dates DESC (newest first)
	return rows.sort((a, b) => {
		if (a.category !== b.category) return a.category.localeCompare(b.category)
		if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
		if (a.version !== b.version) {
			return extractVersionNumber(b.version) - extractVersionNumber(a.version)
		}

		// For dates, parse DD.MM.YYYY format and compare as actual dates (newest first)
		if (a.dates && b.dates) {
			// Extract first date from "DD.MM.YYYY — DD.MM.YYYY" format
			const dateStrA = a.dates.split(' — ')[0]
			const dateStrB = b.dates.split(' — ')[0]

			// Convert DD.MM.YYYY to YYYY-MM-DD for proper comparison
			const [dayA, monthA, yearA] = dateStrA.split('.')
			const [dayB, monthB, yearB] = dateStrB.split('.')
			const dateA = new Date(`${yearA}-${monthA}-${dayA}`)
			const dateB = new Date(`${yearB}-${monthB}-${dayB}`)

			// Descending order (newest first)
			return dateB.getTime() - dateA.getTime()
		}

		return 0
	})
}

/**
 * Fetch Detailed Stats with server-side PAGINATION (using SQL RPC)
 * Returns paginated table data (50 rows per page by default)
 */
export async function getDetailedStatsPaginated(
	filters: DashboardFilters,
	page: number = 0,
	pageSize: number = 50
): Promise<{
	data: DetailedStatsRow[]
	totalCount: number
	totalPages: number
	currentPage: number
	hasNextPage: boolean
	hasPreviousPage: boolean
}> {
	const { dateRange, versions, categories, agents } = filters

	// @ts-expect-error - Supabase RPC types not fully generated yet
	const { data, error } = await supabase.rpc('get_detailed_stats_paginated', {
		p_from_date: dateRange.from.toISOString(),
		p_to_date: dateRange.to.toISOString(),
		p_versions: versions.length > 0 ? versions : null,
		p_categories: categories.length > 0 ? categories : null,
		p_agents: agents && agents.length > 0 ? agents : null,
		p_page: page,
		p_page_size: pageSize,
	})

	if (error) throw error
	// @ts-expect-error - data type inferred as never but we know it's an array
	if (!data || data.length === 0) {
		return {
			data: [],
			totalCount: 0,
			totalPages: 0,
			currentPage: page,
			hasNextPage: false,
			hasPreviousPage: false,
		}
	}

	// SQL function returns out_total_count in every row (for efficiency)
	// @ts-expect-error - accessing dynamic SQL result fields
	const totalCount = data[0].out_total_count || 0
	const totalPages = Math.ceil(totalCount / pageSize)

	// Map SQL results to DetailedStatsRow type
	// Note: SQL function returns fields with 'out_' prefix to avoid ambiguity
	// @ts-expect-error - data.map exists but type is inferred as never
	const rows: DetailedStatsRow[] = data.map((row: unknown) => {
		const r = row as Record<string, unknown>

		// Legacy classification counts
		const criticalErrors = Number(r.out_critical_errors || 0)
		const meaningfulImprovements = Number(r.out_meaningful_improvements || 0)
		const stylisticPreferences = Number(r.out_stylistic_preferences || 0)
		const noSignificantChanges = Number(r.out_no_significant_changes || 0)
		const contextShifts = Number(r.out_context_shifts || 0)

		// New classification counts (from SQL if available, otherwise 0)
		const newCriticalFactErrors = Number(r.out_critical_fact_errors || 0)
		const newMajorFunctionalOmissions = Number(
			r.out_major_functional_omissions || 0
		)
		const newMinorInfoGaps = Number(r.out_minor_info_gaps || 0)
		const newConfusingVerbosity = Number(r.out_confusing_verbosity || 0)
		const newTonalMisalignments = Number(r.out_tonal_misalignments || 0)
		const newStructuralFixes = Number(r.out_structural_fixes || 0)
		const newStylisticEdits = Number(r.out_stylistic_edits || 0)
		const newPerfectMatches = Number(r.out_perfect_matches || 0)
		const newExclWorkflowShifts = Number(r.out_excl_workflow_shifts || 0)
		const newExclDataDiscrepancies = Number(r.out_excl_data_discrepancies || 0)

		// Legacy columns: combine legacy + mapped new classifications (bidirectional)
		const combinedCriticalErrors =
			criticalErrors + newCriticalFactErrors + newMajorFunctionalOmissions
		const combinedMeaningfulImprovements =
			meaningfulImprovements +
			newMinorInfoGaps +
			newConfusingVerbosity +
			newTonalMisalignments
		const combinedStylisticPreferences =
			stylisticPreferences + newStructuralFixes + newStylisticEdits
		const combinedNoSignificantChanges =
			noSignificantChanges + newPerfectMatches
		const combinedContextShifts =
			contextShifts + newExclWorkflowShifts + newExclDataDiscrepancies

		return {
			category: (r.out_category as string) || 'unknown',
			version: (r.out_version as string) || 'unknown',
			dates: r.out_dates as string | null,
			sortOrder: r.out_sort_order as number,
			totalRecords: Number(r.out_total_records),
			reviewedRecords: Number(r.out_reviewed_records || 0),
			aiErrors: Number(r.out_ai_errors || 0),
			aiQuality: Number(r.out_ai_quality || 0),
			// Legacy classifications - combined legacy + mapped new
			criticalErrors: combinedCriticalErrors,
			meaningfulImprovements: combinedMeaningfulImprovements,
			stylisticPreferences: combinedStylisticPreferences,
			noSignificantChanges: combinedNoSignificantChanges,
			contextShifts: combinedContextShifts,
			// New classifications - combine legacy + new for unified view
			// critical_error -> CRITICAL_FACT_ERROR
			criticalFactErrors: newCriticalFactErrors + criticalErrors,
			// MAJOR_FUNCTIONAL_OMISSION (tracked separately)
			majorFunctionalOmissions: newMajorFunctionalOmissions,
			// meaningful_improvement -> MINOR_INFO_GAP
			minorInfoGaps: newMinorInfoGaps + meaningfulImprovements,
			// (no legacy maps to these)
			confusingVerbosity: newConfusingVerbosity,
			tonalMisalignments: newTonalMisalignments,
			structuralFixes: newStructuralFixes,
			// stylistic_preference -> STYLISTIC_EDIT
			stylisticEdits: newStylisticEdits + stylisticPreferences,
			// no_significant_change -> PERFECT_MATCH
			perfectMatches: newPerfectMatches + noSignificantChanges,
			// context_shift -> EXCL_WORKFLOW_SHIFT
			exclWorkflowShifts: newExclWorkflowShifts + contextShifts,
			// (no legacy maps to EXCL_DATA_DISCREPANCY)
			exclDataDiscrepancies: newExclDataDiscrepancies,
			// Average score (not calculated in SQL yet)
			averageScore: null,
		}
	})

	return {
		data: rows,
		totalCount,
		totalPages,
		currentPage: page,
		hasNextPage: page < totalPages - 1,
		hasPreviousPage: page > 0,
	}
}
