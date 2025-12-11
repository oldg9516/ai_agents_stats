/**
 * XLSX Export Utility for Backlog Reports
 *
 * Creates multi-sheet XLSX file matching the structure:
 * - Overview (metrics summary)
 * - Main Patterns
 * - Temporal Trends
 * - Specific Issues
 * - Weekly Stats
 * - Recommendations
 */

import * as XLSX from 'xlsx'
import type {
	BacklogReport,
	CategoryStats,
	MainPattern,
	TemporalTrend,
	SpecificIssue,
	WeeklyStats,
} from '@/lib/supabase/types'
import { format, parseISO } from 'date-fns'

/**
 * Safely parse JSON data that might be a string or already parsed
 */
function safeJsonParse<T>(data: T | string, fallback: T): T {
	if (data === null || data === undefined) return fallback
	if (typeof data === 'string') {
		try {
			return JSON.parse(data) as T
		} catch {
			return fallback
		}
	}
	return data
}

/**
 * Export a backlog report to XLSX format with multiple sheets
 */
export function exportBacklogReportToXLSX(report: BacklogReport): void {
	// Parse JSON fields
	const stats = safeJsonParse<CategoryStats>(report.stats, {})
	const weeklyStats = safeJsonParse<WeeklyStats[]>(report.weekly_stats, [])
	const mainPatterns = safeJsonParse<MainPattern[]>(report.main_patterns, [])
	const temporalTrends = safeJsonParse<TemporalTrend[]>(report.temporal_trends, [])
	const specificIssues = safeJsonParse<SpecificIssue[]>(report.specific_issues, [])
	const recommendations = safeJsonParse<string[]>(report.recommendations, [])

	// Create workbook
	const workbook = XLSX.utils.book_new()

	// Format date range for filename
	const dateTo = parseISO(report.date_to)

	// 1. Overview Sheet
	const overviewData = [
		['metric', 'value'],
		['Total Tickets Analyzed', report.total_tickets],
		['Period', `${report.date_from} to ${report.date_to}`],
		['Executive Summary', report.executive_summary],
		// Add category stats
		...Object.entries(stats).map(([category, count]) => [
			`Category: ${category}`,
			count,
		]),
	]
	const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData)
	overviewSheet['!cols'] = [{ wch: 40 }, { wch: 100 }]
	XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview')

	// 2. Main Patterns Sheet
	const patternsData = [
		['rank', 'pattern', 'description', 'volume', 'examples', 'business_insight'],
		...mainPatterns.map((p) => [
			p.rank,
			p.pattern_name,
			p.description,
			p.volume,
			Array.isArray(p.examples) ? p.examples.join(' | ') : p.examples,
			p.business_insight,
		]),
	]
	const patternsSheet = XLSX.utils.aoa_to_sheet(patternsData)
	patternsSheet['!cols'] = [
		{ wch: 6 },
		{ wch: 40 },
		{ wch: 80 },
		{ wch: 30 },
		{ wch: 80 },
		{ wch: 80 },
	]
	XLSX.utils.book_append_sheet(workbook, patternsSheet, 'Main Patterns')

	// 3. Temporal Trends Sheet
	const trendsData = [
		['observation', 'timeframe', 'possible_cause'],
		...temporalTrends.map((t) => [
			t.observation,
			t.timeframe,
			t.possible_cause,
		]),
	]
	const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData)
	trendsSheet['!cols'] = [{ wch: 80 }, { wch: 40 }, { wch: 80 }]
	XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Temporal Trends')

	// 4. Specific Issues Sheet
	const issuesData = [
		['issue', 'details', 'affected_period'],
		...specificIssues.map((i) => [
			i.issue,
			i.details,
			i.affected_period,
		]),
	]
	const issuesSheet = XLSX.utils.aoa_to_sheet(issuesData)
	issuesSheet['!cols'] = [{ wch: 50 }, { wch: 100 }, { wch: 40 }]
	XLSX.utils.book_append_sheet(workbook, issuesSheet, 'Specific Issues')

	// 5. Weekly Stats Sheet
	// Get all category keys from weekly stats
	const categoryKeys = new Set<string>()
	weeklyStats.forEach((ws) => {
		Object.keys(ws).forEach((key) => {
			if (key !== 'week' && key !== 'total') {
				categoryKeys.add(key)
			}
		})
	})
	const categoryList = Array.from(categoryKeys).sort()

	const weeklyHeaders = ['week', 'total', ...categoryList]
	const weeklyData = [
		weeklyHeaders,
		...weeklyStats.map((ws) => [
			ws.week,
			ws.total,
			...categoryList.map((cat) => ws[cat] ?? 0),
		]),
	]
	const weeklySheet = XLSX.utils.aoa_to_sheet(weeklyData)
	weeklySheet['!cols'] = [
		{ wch: 25 },
		{ wch: 10 },
		...categoryList.map(() => ({ wch: 18 })),
	]
	XLSX.utils.book_append_sheet(workbook, weeklySheet, 'Weekly Stats')

	// 6. Recommendations Sheet
	const recommendationsData = [
		['number', 'recommendation'],
		...recommendations.map((r, i) => [
			i + 1,
			r,
		]),
	]
	const recommendationsSheet = XLSX.utils.aoa_to_sheet(recommendationsData)
	recommendationsSheet['!cols'] = [{ wch: 8 }, { wch: 150 }]
	XLSX.utils.book_append_sheet(workbook, recommendationsSheet, 'Recommendations')

	// Generate filename
	const filename = `Backlog Analysis ${report.period_days} days - ${format(dateTo, 'yyyy-MM-dd')}.xlsx`

	// Write and download
	XLSX.writeFile(workbook, filename)
}
