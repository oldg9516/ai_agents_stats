'use server'

/**
 * Ticket Update Actions
 *
 * Server Actions for updating ticket review data in ticket_reviews table
 * Uses UPSERT (INSERT ON CONFLICT UPDATE) since ticket_reviews rows may not exist yet
 */

import { revalidatePath } from 'next/cache'
import { createAuthClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { ticketReviews, aiHumanComparison } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { ActionAnalysisVerification } from '@/lib/db/types'

export interface UpdateTicketReviewResult {
	success: boolean
	error?: string
}

async function requireAuth(): Promise<string> {
	const supabase = await createAuthClient()
	const { data: { user }, error } = await supabase.auth.getUser()
	if (error || !user?.email) {
		throw new Error('Unauthorized')
	}
	return user.email
}

/**
 * Update ticket review status
 */
export async function updateTicketReviewStatus(
	ticketId: number,
	status: 'processed' | 'unprocessed'
): Promise<UpdateTicketReviewResult> {
	try {
		await requireAuth()

		await db
			.insert(ticketReviews)
			.values({ comparisonId: ticketId, reviewStatus: status })
			.onConflictDoUpdate({
				target: ticketReviews.comparisonId,
				set: { reviewStatus: status },
			})

		revalidatePath('/tickets-review')
		return { success: true }
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			return { success: false, error: 'Unauthorized' }
		}
		console.error('Unexpected error in updateTicketReviewStatus:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}

/**
 * Update AI approval status
 */
export async function updateAiApproval(
	ticketId: number,
	approved: boolean
): Promise<UpdateTicketReviewResult> {
	try {
		await requireAuth()

		await db
			.insert(ticketReviews)
			.values({ comparisonId: ticketId, aiApproved: approved })
			.onConflictDoUpdate({
				target: ticketReviews.comparisonId,
				set: { aiApproved: approved },
			})

		revalidatePath('/tickets-review')
		return { success: true }
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			return { success: false, error: 'Unauthorized' }
		}
		console.error('Unexpected error in updateAiApproval:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}

/**
 * Update review data (status, AI approval, comment, reviewer, verification) in one UPSERT
 */
export async function updateTicketReview(
	ticketId: number,
	data: {
		reviewStatus?: 'processed' | 'unprocessed'
		aiApproved?: boolean
		manualComment?: string
		reviewerName?: string
		requiresEditingCorrect?: boolean | null
		actionAnalysisVerification?: ActionAnalysisVerification | null
		changeClassification?: string
	}
): Promise<UpdateTicketReviewResult> {
	try {
		await requireAuth()

		const insertValues: typeof ticketReviews.$inferInsert = {
			comparisonId: ticketId,
		}

		const updateSet: Partial<typeof ticketReviews.$inferInsert> = {}

		if (data.reviewStatus !== undefined) {
			insertValues.reviewStatus = data.reviewStatus
			updateSet.reviewStatus = data.reviewStatus
		}
		if (data.aiApproved !== undefined) {
			insertValues.aiApproved = data.aiApproved
			updateSet.aiApproved = data.aiApproved
		}
		if (data.manualComment !== undefined) {
			insertValues.manualComment = data.manualComment
			updateSet.manualComment = data.manualComment
		}
		if (data.reviewerName !== undefined) {
			insertValues.reviewerName = data.reviewerName
			updateSet.reviewerName = data.reviewerName
		}
		if (data.requiresEditingCorrect !== undefined) {
			insertValues.requiresEditingCorrect = data.requiresEditingCorrect
			updateSet.requiresEditingCorrect = data.requiresEditingCorrect
		}
		if (data.actionAnalysisVerification !== undefined) {
			insertValues.actionAnalysisVerification = data.actionAnalysisVerification
			updateSet.actionAnalysisVerification = data.actionAnalysisVerification
		}

		await db
			.insert(ticketReviews)
			.values(insertValues)
			.onConflictDoUpdate({
				target: ticketReviews.comparisonId,
				set: updateSet,
			})

		// Update change_classification in ai_human_comparison if provided
		if (data.changeClassification !== undefined) {
			await db
				.update(aiHumanComparison)
				.set({ changeClassification: data.changeClassification })
				.where(eq(aiHumanComparison.id, ticketId))
		}

		revalidatePath('/tickets-review')
		return { success: true }
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			return { success: false, error: 'Unauthorized' }
		}
		console.error('Unexpected error in updateTicketReview:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}
