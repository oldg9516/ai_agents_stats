'use server'

/**
 * Retention Transparency Server Actions
 *
 * Read traces of the AI flow per retention ticket + write support-agent
 * comments. All reads are timeout-protected; the comment write is auth-gated.
 */

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import {
	fetchRetentionList,
	fetchRetentionSubtypes,
	fetchRetentionTrace,
	insertRetentionComment,
} from '@/lib/db/queries-retention'
import { REQUEST_TIMEOUT } from '@/lib/queries/query-config'
import type {
	RetentionFilters,
	RetentionListItem,
	RetentionTicketTrace,
} from '@/lib/db/types'

function createTimeoutPromise(ms: number, op: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(() => reject(new Error(`${op} timed out after ${ms}ms`)), ms),
	)
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	return 'Unknown error'
}

export async function fetchRetentionListAction(
	filters: RetentionFilters,
	pagination: { limit: number; offset: number },
): Promise<{ success: boolean; data?: RetentionListItem[]; error?: string }> {
	try {
		const data = await Promise.race([
			fetchRetentionList(filters, pagination),
			createTimeoutPromise(REQUEST_TIMEOUT, 'Retention list fetch'),
		])
		return { success: true, data }
	} catch (error) {
		console.error('[Retention] list error:', getErrorMessage(error))
		return { success: false, error: getErrorMessage(error) }
	}
}

export async function fetchRetentionTraceAction(
	ticketId: string,
): Promise<{ success: boolean; data?: RetentionTicketTrace | null; error?: string }> {
	try {
		const data = await Promise.race([
			fetchRetentionTrace(ticketId),
			createTimeoutPromise(REQUEST_TIMEOUT, 'Retention trace fetch'),
		])
		return { success: true, data }
	} catch (error) {
		console.error('[Retention] trace error:', getErrorMessage(error))
		return { success: false, error: getErrorMessage(error) }
	}
}

export async function fetchRetentionSubtypesAction(dateRange: {
	from: Date
	to: Date
}): Promise<{ success: boolean; data?: string[]; error?: string }> {
	try {
		const data = await fetchRetentionSubtypes(dateRange)
		return { success: true, data }
	} catch (error) {
		return { success: false, error: getErrorMessage(error) }
	}
}

export async function addRetentionCommentAction(input: {
	ticketId: string
	threadId: string | null
	comment: string
}): Promise<{ success: boolean; error?: string }> {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return { success: false, error: 'Unauthorized' }
		}
		const text = input.comment.trim()
		if (!text) return { success: false, error: 'Empty comment' }

		await insertRetentionComment({
			ticketId: input.ticketId,
			threadId: input.threadId,
			author: session.user.email,
			comment: text,
		})

		revalidatePath('/retention')
		return { success: true }
	} catch (error) {
		console.error('[Retention] add comment error:', getErrorMessage(error))
		return { success: false, error: getErrorMessage(error) }
	}
}
