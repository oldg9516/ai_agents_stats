'use server'

/**
 * Ticket Update Actions
 *
 * Server Actions for updating ticket review status and AI approval
 */

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/supabase/types'

export interface UpdateTicketReviewResult {
	success: boolean
	error?: string
}

/**
 * Update ticket review status
 */
export async function updateTicketReviewStatus(
	ticketId: number,
	status: 'processed' | 'unprocessed'
): Promise<UpdateTicketReviewResult> {
	try {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
		const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!

		const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
			},
		})

		const { error } = await supabase
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
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
		const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!

		const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
			},
		})

		const { error } = await supabase
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
	}
): Promise<UpdateTicketReviewResult> {
	try {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
		const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!

		const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
			},
		})

		const updateData: {
			review_status?: 'processed' | 'unprocessed'
			ai_approved?: boolean
		} = {}

		if (data.reviewStatus !== undefined) {
			updateData.review_status = data.reviewStatus
		}
		if (data.aiApproved !== undefined) {
			updateData.ai_approved = data.aiApproved
		}

		const { error } = await supabase
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
		console.error('Unexpected error in updateTicketReview:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}
