'use server'

import type { ChatSession, ChatMessage, MessageRole, ContentType, ChatMessageMetadata } from '@/types/chat'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { dashboardChatSessions, dashboardChatMessages } from '@/lib/db/schema'
import { and, eq, gte, asc, desc } from 'drizzle-orm'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMessage(data: any): ChatMessage {
	return {
		id: data.id,
		session_id: data.sessionId,
		role: data.role as MessageRole,
		content: data.content ?? '',
		content_type: (data.contentType || 'text') as ContentType,
		metadata: (data.metadata as ChatMessageMetadata) || {},
		agent_name: data.agentName ?? undefined,
		parent_message_id: data.parentMessageId ?? undefined,
		created_at: data.createdAt instanceof Date ? data.createdAt.toISOString() : (data.createdAt ?? new Date().toISOString()),
	}
}

async function requireAuth(): Promise<string> {
	const session = await auth()
	if (!session?.user?.email) {
		throw new Error('Unauthorized')
	}
	return session.user.email
}

// === Session Actions ===

export async function createChatSession(
	title?: string | null,
	metadata?: Record<string, unknown>
): Promise<ChatSession | null> {
	const email = await requireAuth()

	const result = await db
		.insert(dashboardChatSessions)
		.values({
			visitorId: email,
			title: title ?? null,
			metadata: metadata ?? {},
			isArchived: false,
		})
		.returning()

	if (!result[0]) {
		console.error('Error creating chat session: no result returned')
		return null
	}

	const data = result[0]
	return {
		id: data.id,
		visitor_id: data.visitorId,
		title: data.title,
		created_at: data.createdAt?.toISOString() ?? new Date().toISOString(),
		updated_at: data.updatedAt?.toISOString() ?? new Date().toISOString(),
		metadata: (data.metadata as Record<string, unknown>) || {},
		is_archived: data.isArchived ?? false,
	}
}

export async function getChatSessions(): Promise<ChatSession[]> {
	const email = await requireAuth()

	const data = await db
		.select()
		.from(dashboardChatSessions)
		.where(
			and(
				eq(dashboardChatSessions.visitorId, email),
				eq(dashboardChatSessions.isArchived, false)
			)
		)
		.orderBy(desc(dashboardChatSessions.updatedAt))
		.limit(50)

	return data.map((session) => ({
		id: session.id,
		visitor_id: session.visitorId,
		title: session.title,
		created_at: session.createdAt?.toISOString() ?? new Date().toISOString(),
		updated_at: session.updatedAt?.toISOString() ?? new Date().toISOString(),
		metadata: (session.metadata as Record<string, unknown>) || {},
		is_archived: session.isArchived ?? false,
	}))
}

export async function updateSessionTitle(
	sessionId: string,
	title: string
): Promise<boolean> {
	const email = await requireAuth()

	const result = await db
		.update(dashboardChatSessions)
		.set({ title, updatedAt: new Date() })
		.where(
			and(
				eq(dashboardChatSessions.id, sessionId),
				eq(dashboardChatSessions.visitorId, email)
			)
		)
		.returning({ id: dashboardChatSessions.id })

	if (result.length === 0) {
		console.error('Error updating session title: session not found or not owned by user')
		return false
	}

	return true
}

export async function deleteSession(sessionId: string): Promise<boolean> {
	const email = await requireAuth()

	// Verify ownership before deleting
	const session = await db
		.select({ id: dashboardChatSessions.id })
		.from(dashboardChatSessions)
		.where(
			and(
				eq(dashboardChatSessions.id, sessionId),
				eq(dashboardChatSessions.visitorId, email)
			)
		)
		.limit(1)

	if (session.length === 0) {
		console.error('Session not found or not owned by user')
		return false
	}

	// Delete all messages first (cascade should handle this, but let's be safe)
	await db
		.delete(dashboardChatMessages)
		.where(eq(dashboardChatMessages.sessionId, sessionId))

	// Delete the session
	const result = await db
		.delete(dashboardChatSessions)
		.where(
			and(
				eq(dashboardChatSessions.id, sessionId),
				eq(dashboardChatSessions.visitorId, email)
			)
		)
		.returning({ id: dashboardChatSessions.id })

	if (result.length === 0) {
		console.error('Error deleting session')
		return false
	}

	return true
}

// === Message Actions ===

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
	const email = await requireAuth()

	// Verify session ownership
	const session = await db
		.select({ id: dashboardChatSessions.id })
		.from(dashboardChatSessions)
		.where(
			and(
				eq(dashboardChatSessions.id, sessionId),
				eq(dashboardChatSessions.visitorId, email)
			)
		)
		.limit(1)

	if (session.length === 0) {
		console.error('Session not found or not owned by user')
		return []
	}

	const data = await db
		.select()
		.from(dashboardChatMessages)
		.where(eq(dashboardChatMessages.sessionId, sessionId))
		.orderBy(asc(dashboardChatMessages.createdAt))

	return data.map(toMessage)
}

export async function saveChatMessage(
	message: Omit<ChatMessage, 'id' | 'created_at'>
): Promise<ChatMessage | null> {
	const email = await requireAuth()

	// Verify session ownership
	const session = await db
		.select({ id: dashboardChatSessions.id })
		.from(dashboardChatSessions)
		.where(
			and(
				eq(dashboardChatSessions.id, message.session_id),
				eq(dashboardChatSessions.visitorId, email)
			)
		)
		.limit(1)

	if (session.length === 0) {
		console.error('Session not found or not owned by user')
		return null
	}

	const result = await db
		.insert(dashboardChatMessages)
		.values({
			sessionId: message.session_id,
			role: message.role,
			content: message.content,
			contentType: message.content_type,
			metadata: message.metadata,
			agentName: message.agent_name,
			parentMessageId: message.parent_message_id,
		})
		.returning()

	if (!result[0]) {
		console.error('Error saving chat message: no result returned')
		return null
	}

	// Update session updated_at
	await db
		.update(dashboardChatSessions)
		.set({ updatedAt: new Date() })
		.where(eq(dashboardChatSessions.id, message.session_id))

	return toMessage(result[0])
}

// Polling response type
export interface PollingResponse {
	status: 'processing' | 'completed' | 'error'
	message: ChatMessage | null
}

// Poll for message by message_id (for long-running requests)
export async function pollMessageByMessageId(messageId: string): Promise<PollingResponse> {
	const email = await requireAuth()

	const result = await db
		.select()
		.from(dashboardChatMessages)
		.where(eq(dashboardChatMessages.messageId, messageId))
		.limit(1)

	if (result.length === 0) {
		return { status: 'processing', message: null }
	}

	const data = result[0]

	// Verify session ownership to prevent IDOR
	const session = await db
		.select({ id: dashboardChatSessions.id })
		.from(dashboardChatSessions)
		.where(
			and(
				eq(dashboardChatSessions.id, data.sessionId),
				eq(dashboardChatSessions.visitorId, email)
			)
		)
		.limit(1)

	if (session.length === 0) {
		return { status: 'error', message: null }
	}

	// Check status field
	const status = data.status as string

	if (status === 'completed') {
		return { status: 'completed', message: toMessage(data) }
	}

	if (status === 'error') {
		const msg = toMessage(data)
		msg.content = data.content || 'Произошла ошибка при обработке запроса'
		msg.content_type = 'text' as ContentType
		msg.metadata = { error: data.content || 'Unknown error' }
		return { status: 'error', message: msg }
	}

	// status === 'processing' or other
	return { status: 'processing', message: null }
}

export async function deleteMessagesFromId(
	sessionId: string,
	messageId: string
): Promise<boolean> {
	const email = await requireAuth()

	// Verify session ownership
	const session = await db
		.select({ id: dashboardChatSessions.id })
		.from(dashboardChatSessions)
		.where(
			and(
				eq(dashboardChatSessions.id, sessionId),
				eq(dashboardChatSessions.visitorId, email)
			)
		)
		.limit(1)

	if (session.length === 0) {
		console.error('Session not found or not owned by user')
		return false
	}

	// First get the message to find its created_at (scoped to session to prevent cross-session leaks)
	const targetMessage = await db
		.select({ createdAt: dashboardChatMessages.createdAt })
		.from(dashboardChatMessages)
		.where(
			and(
				eq(dashboardChatMessages.id, messageId),
				eq(dashboardChatMessages.sessionId, sessionId)
			)
		)
		.limit(1)

	if (targetMessage.length === 0 || !targetMessage[0].createdAt) {
		console.error('Error fetching target message')
		return false
	}

	// Delete this message and all messages after it
	await db
		.delete(dashboardChatMessages)
		.where(
			and(
				eq(dashboardChatMessages.sessionId, sessionId),
				gte(dashboardChatMessages.createdAt, targetMessage[0].createdAt)
			)
		)

	return true
}
