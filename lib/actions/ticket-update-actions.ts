'use server'

/**
 * Ticket Update Actions
 *
 * Server Actions for updating ticket review status and AI approval
 */

import { revalidatePath } from 'next/cache'
import { createAuthClient, supabaseServer } from '@/lib/supabase/server'

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

		const { error } = await supabaseServer
			.from('ai_human_comparison')
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore - Supabase type generation issue with review_status field
			.update({ review_status: status })
			.eq('id', ticketId)

		if (error) {
			console.error('Error updating ticket review status:', error)
			return { success: false, error: error.message }
		}

		// Revalidate the tickets review page
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

		const { error } = await supabaseServer
			.from('ai_human_comparison')
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore - Supabase type generation issue with ai_approved field
			.update({ ai_approved: approved })
			.eq('id', ticketId)

		if (error) {
			console.error('Error updating AI approval:', error)
			return { success: false, error: error.message }
		}

		// Revalidate the tickets review page
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
 * Update both review status and AI approval in one transaction
 */
export async function updateTicketReview(
	ticketId: number,
	data: {
		reviewStatus?: 'processed' | 'unprocessed'
		aiApproved?: boolean
		manualComment?: string
		reviewerName?: string
	}
): Promise<UpdateTicketReviewResult> {
	try {
		await requireAuth()

		const updateData: {
			review_status?: 'processed' | 'unprocessed'
			ai_approved?: boolean
			manual_comment?: string
			reviewer_name?: string
		} = {}

		if (data.reviewStatus !== undefined) {
			updateData.review_status = data.reviewStatus
		}
		if (data.aiApproved !== undefined) {
			updateData.ai_approved = data.aiApproved
		}
		if (data.manualComment !== undefined) {
			updateData.manual_comment = data.manualComment
		}
		if (data.reviewerName !== undefined) {
			updateData.reviewer_name = data.reviewerName
		}

		const { error } = await supabaseServer
			.from('ai_human_comparison')
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore - Supabase type generation issue with review_status and ai_approved fields
			.update(updateData)
			.eq('id', ticketId)

		if (error) {
			console.error('Error updating ticket review:', error)
			return { success: false, error: error.message }
		}

		// Revalidate the tickets review page
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
