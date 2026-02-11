'use server'

/**
 * Ticket Update Actions
 *
 * Server Actions for updating ticket review data in ticket_reviews table
 * Uses UPSERT (INSERT ON CONFLICT UPDATE) since ticket_reviews rows may not exist yet
 */

import { revalidatePath } from 'next/cache'
import { createAuthClient, supabaseServer } from '@/lib/supabase/server'
import type { ActionAnalysisVerification, Database } from '@/lib/supabase/types'

type TicketReviewInsert = Database['public']['Tables']['ticket_reviews']['Insert']

// Supabase client's .from() generic doesn't resolve Insert type for manually added tables
// (will be fixed when types are regenerated with `supabase gen types`).
// We use `as any` on .from() but `satisfies TicketReviewInsert` on data for type safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ticketReviewsTable = () => supabaseServer.from('ticket_reviews') as any

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

		const { error } = await ticketReviewsTable()
			.upsert(
				{ comparison_id: ticketId, review_status: status } satisfies TicketReviewInsert,
				{ onConflict: 'comparison_id' }
			)

		if (error) {
			console.error('Error updating ticket review status:', error)
			return { success: false, error: error.message }
		}

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

		const { error } = await ticketReviewsTable()
			.upsert(
				{ comparison_id: ticketId, ai_approved: approved } satisfies TicketReviewInsert,
				{ onConflict: 'comparison_id' }
			)

		if (error) {
			console.error('Error updating AI approval:', error)
			return { success: false, error: error.message }
		}

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

		const upsertData: TicketReviewInsert = {
			comparison_id: ticketId,
		}

		if (data.reviewStatus !== undefined) {
			upsertData.review_status = data.reviewStatus
		}
		if (data.aiApproved !== undefined) {
			upsertData.ai_approved = data.aiApproved
		}
		if (data.manualComment !== undefined) {
			upsertData.manual_comment = data.manualComment
		}
		if (data.reviewerName !== undefined) {
			upsertData.reviewer_name = data.reviewerName
		}
		if (data.requiresEditingCorrect !== undefined) {
			upsertData.requires_editing_correct = data.requiresEditingCorrect
		}
		if (data.actionAnalysisVerification !== undefined) {
			upsertData.action_analysis_verification = data.actionAnalysisVerification
		}

		const { error } = await ticketReviewsTable()
			.upsert(upsertData, { onConflict: 'comparison_id' })

		if (error) {
			console.error('Error updating ticket review:', error)
			return { success: false, error: error.message }
		}

		// Update change_classification in ai_human_comparison if provided
		if (data.changeClassification !== undefined) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { error: classError } = await (supabaseServer.from('ai_human_comparison') as any)
				.update({ change_classification: data.changeClassification })
				.eq('id', ticketId)

			if (classError) {
				console.error('Error updating classification:', classError)
				return { success: false, error: classError.message }
			}
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
