/**
 * Support Overview Calculation Utilities
 *
 * Helper functions for calculating metrics and transforming data
 */

import type { SupportThread, CorrelationCell, SankeyData } from '../supabase/types'
import { getAllRequirementKeys } from '@/constants/requirement-types'

/**
 * Calculate correlation coefficient between two boolean arrays
 * Returns value between 0 and 1, where 1 means perfect correlation
 */
export function calculateCorrelation(
	data: boolean[],
	otherData: boolean[]
): number {
	if (data.length !== otherData.length || data.length === 0) return 0

	// Count co-occurrences
	let bothTrue = 0
	let total = data.length

	for (let i = 0; i < data.length; i++) {
		if (data[i] && otherData[i]) {
			bothTrue++
		}
	}

	return bothTrue / total
}

/**
 * Build correlation matrix from thread data
 */
export function buildCorrelationMatrix(
	threads: SupportThread[]
): CorrelationCell[] {
	const requirementKeys = getAllRequirementKeys()
	const correlations: CorrelationCell[] = []

	// Extract boolean arrays for each requirement
	const requirementArrays = new Map<string, boolean[]>()
	requirementKeys.forEach((key) => {
		requirementArrays.set(
			key,
			threads.map((t) => (t[key] as boolean) || false)
		)
	})

	// Calculate correlation for each pair
	for (const req1 of requirementKeys) {
		for (const req2 of requirementKeys) {
			const data1 = requirementArrays.get(req1) || []
			const data2 = requirementArrays.get(req2) || []

			correlations.push({
				x: req1,
				y: req2,
				value: calculateCorrelation(data1, data2),
			})
		}
	}

	return correlations
}

/**
 * Transform threads into Sankey flow data
 */
export function buildSankeyFlow(threads: SupportThread[]): SankeyData {
	// Count flows
	const flowCounts = {
		created: 0,
		usedAsIs: 0,
		edited: 0,
		rejected: 0,
		resolvedFromUsed: 0,
		resolvedFromEdited: 0,
		pendingFromUsed: 0,
		pendingFromEdited: 0,
	}

	threads.forEach((thread) => {
		if (thread.ai_draft_reply) {
			flowCounts.created++

			const wasEdited = thread.requires_editing || thread.changed
			const isResolved = thread.status === 'resolved'

			if (wasEdited) {
				flowCounts.edited++
				if (isResolved) {
					flowCounts.resolvedFromEdited++
				} else {
					flowCounts.pendingFromEdited++
				}
			} else {
				flowCounts.usedAsIs++
				if (isResolved) {
					flowCounts.resolvedFromUsed++
				} else {
					flowCounts.pendingFromUsed++
				}
			}
		} else {
			flowCounts.rejected++
		}
	})

	const nodes: SankeyData['nodes'] = [
		{ id: 'created', label: 'AI Draft Created' },
		{ id: 'used', label: 'Used As-Is' },
		{ id: 'edited', label: 'Edited' },
		{ id: 'rejected', label: 'No Draft' },
		{ id: 'resolved', label: 'Resolved' },
		{ id: 'pending', label: 'Pending' },
	]

	const links: SankeyData['links'] = [
		{ source: 'created', target: 'used', value: flowCounts.usedAsIs },
		{ source: 'created', target: 'edited', value: flowCounts.edited },
		{
			source: 'used',
			target: 'resolved',
			value: flowCounts.resolvedFromUsed,
		},
		{
			source: 'edited',
			target: 'resolved',
			value: flowCounts.resolvedFromEdited,
		},
		{
			source: 'used',
			target: 'pending',
			value: flowCounts.pendingFromUsed,
		},
		{
			source: 'edited',
			target: 'pending',
			value: flowCounts.pendingFromEdited,
		},
	]

	// Filter out zero-value links
	const filteredLinks = links.filter((link) => link.value > 0)

	return { nodes, links: filteredLinks }
}

/**
 * Calculate average number of requirements per thread
 */
export function calculateAverageRequirements(threads: SupportThread[]): number {
	if (threads.length === 0) return 0

	const totalRequirements = threads.reduce((sum, thread) => {
		return (
			sum + getAllRequirementKeys().filter((key) => thread[key] === true).length
		)
	}, 0)

	return totalRequirements / threads.length
}

/**
 * Calculate AI draft coverage percentage
 */
export function calculateAIDraftCoverage(threads: SupportThread[]): number {
	if (threads.length === 0) return 0

	const withDraft = threads.filter((t) => t.ai_draft_reply !== null).length
	return (withDraft / threads.length) * 100
}

/**
 * Calculate percentage of threads requiring reply
 */
export function calculateReplyRequiredPercentage(
	threads: SupportThread[]
): number {
	if (threads.length === 0) return 0

	const requiresReply = threads.filter((t) => t.requires_reply === true).length
	return (requiresReply / threads.length) * 100
}

/**
 * Calculate data collection rate (resolved threads)
 */
export function calculateDataCollectionRate(threads: SupportThread[]): number {
	if (threads.length === 0) return 0

	const resolved = threads.filter((t) => t.status === 'resolved').length
	return (resolved / threads.length) * 100
}

/**
 * Get quality score for a thread
 * Based on whether qualified agent made changes
 */
export function getThreadQuality(thread: SupportThread): number | null {
	if (thread.changed === null) return null
	return thread.changed ? 0 : 100 // No changes = 100% quality
}
