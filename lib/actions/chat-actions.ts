'use server'

import { createClient } from '@supabase/supabase-js'
import { ChatSession, ChatMessage } from '@/types/chat'
import { createAuthClient } from '@/lib/supabase/server'

// Untyped admin client for chat tables (not in Database type)
function getChatAdmin() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
	return createClient(supabaseUrl, supabaseServiceKey)
}

async function requireAuth(): Promise<string> {
	const supabase = await createAuthClient()
	const { data: { user }, error } = await supabase.auth.getUser()
	if (error || !user?.email) {
		throw new Error('Unauthorized')
	}
	return user.email
}

// === Session Actions ===

export async function createChatSession(
	title?: string | null,
	metadata?: Record<string, unknown>
): Promise<ChatSession | null> {
	const email = await requireAuth()
	const supabase = getChatAdmin()

	const { data, error } = await supabase
		.from('dashboard_chat_sessions')
		.insert({
			visitor_id: email,
			title: title ?? null,
			metadata: metadata ?? {},
			is_archived: false,
		})
		.select('id, visitor_id, title, created_at, updated_at, metadata, is_archived')
		.single()

	if (error) {
		console.error('Error creating chat session:', error)
		return null
	}

	return {
		id: data.id,
		visitor_id: data.visitor_id,
		title: data.title,
		created_at: data.created_at,
		updated_at: data.updated_at,
		metadata: data.metadata || {},
		is_archived: data.is_archived,
	}
}

export async function getChatSessions(): Promise<ChatSession[]> {
	const email = await requireAuth()
	const supabase = getChatAdmin()

	const { data, error } = await supabase
		.from('dashboard_chat_sessions')
		.select('id, visitor_id, title, created_at, updated_at, metadata, is_archived')
		.eq('visitor_id', email)
		.eq('is_archived', false)
		.order('updated_at', { ascending: false })
		.limit(50)

	if (error) {
		console.error('Error fetching chat sessions:', error)
		return []
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return data.map((session: any) => ({
		id: session.id,
		visitor_id: session.visitor_id,
		title: session.title,
		created_at: session.created_at,
		updated_at: session.updated_at,
		metadata: session.metadata || {},
		is_archived: session.is_archived,
	}))
}

export async function updateSessionTitle(
	sessionId: string,
	title: string
): Promise<boolean> {
	const email = await requireAuth()
	const supabase = getChatAdmin()

	const { error } = await supabase
		.from('dashboard_chat_sessions')
		.update({ title, updated_at: new Date().toISOString() })
		.eq('id', sessionId)
		.eq('visitor_id', email)

	if (error) {
		console.error('Error updating session title:', error)
		return false
	}

	return true
}

export async function deleteSession(sessionId: string): Promise<boolean> {
	const email = await requireAuth()
	const supabase = getChatAdmin()

	// Verify ownership before deleting
	const { data: session } = await supabase
		.from('dashboard_chat_sessions')
		.select('id')
		.eq('id', sessionId)
		.eq('visitor_id', email)
		.single()

	if (!session) {
		console.error('Session not found or not owned by user')
		return false
	}

	// Delete all messages first (cascade should handle this, but let's be safe)
	await supabase
		.from('dashboard_chat_messages')
		.delete()
		.eq('session_id', sessionId)

	// Delete the session
	const { error } = await supabase
		.from('dashboard_chat_sessions')
		.delete()
		.eq('id', sessionId)
		.eq('visitor_id', email)

	if (error) {
		console.error('Error deleting session:', error)
		return false
	}

	return true
}

// === Message Actions ===

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
	const email = await requireAuth()
	const supabase = getChatAdmin()

	// Verify session ownership
	const { data: session } = await supabase
		.from('dashboard_chat_sessions')
		.select('id')
		.eq('id', sessionId)
		.eq('visitor_id', email)
		.single()

	if (!session) {
		console.error('Session not found or not owned by user')
		return []
	}

	const { data, error } = await supabase
		.from('dashboard_chat_messages')
		.select('id, session_id, role, content, content_type, metadata, agent_name, parent_message_id, created_at')
		.eq('session_id', sessionId)
		.order('created_at', { ascending: true })

	if (error) {
		console.error('Error fetching chat messages:', error)
		return []
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return data.map((msg: any) => ({
		id: msg.id,
		session_id: msg.session_id,
		role: msg.role,
		content: msg.content,
		content_type: msg.content_type || 'text',
		metadata: msg.metadata || {},
		agent_name: msg.agent_name,
		parent_message_id: msg.parent_message_id,
		created_at: msg.created_at,
	}))
}

export async function saveChatMessage(
	message: Omit<ChatMessage, 'id' | 'created_at'>
): Promise<ChatMessage | null> {
	const email = await requireAuth()
	const supabase = getChatAdmin()

	// Verify session ownership
	const { data: session } = await supabase
		.from('dashboard_chat_sessions')
		.select('id')
		.eq('id', message.session_id)
		.eq('visitor_id', email)
		.single()

	if (!session) {
		console.error('Session not found or not owned by user')
		return null
	}

	const { data, error } = await supabase
		.from('dashboard_chat_messages')
		.insert({
			session_id: message.session_id,
			role: message.role,
			content: message.content,
			content_type: message.content_type,
			metadata: message.metadata,
			agent_name: message.agent_name,
			parent_message_id: message.parent_message_id,
		})
		.select('id, session_id, role, content, content_type, metadata, agent_name, parent_message_id, created_at')
		.single()

	if (error) {
		console.error('Error saving chat message:', error)
		return null
	}

	// Update session updated_at
	await supabase
		.from('dashboard_chat_sessions')
		.update({ updated_at: new Date().toISOString() })
		.eq('id', message.session_id)

	return {
		id: data.id,
		session_id: data.session_id,
		role: data.role,
		content: data.content,
		content_type: data.content_type || 'text',
		metadata: data.metadata || {},
		agent_name: data.agent_name,
		parent_message_id: data.parent_message_id,
		created_at: data.created_at,
	}
}

// Polling response type
export interface PollingResponse {
	status: 'processing' | 'completed' | 'error'
	message: ChatMessage | null
}

// Poll for message by message_id (for long-running requests)
export async function pollMessageByMessageId(messageId: string): Promise<PollingResponse> {
	await requireAuth()
	const supabase = getChatAdmin()

	const { data, error } = await supabase
		.from('dashboard_chat_messages')
		.select('id, session_id, role, content, content_type, metadata, agent_name, parent_message_id, created_at, status')
		.eq('message_id', messageId)
		.single()

	if (error) {
		// Not found yet - still processing
		if (error.code === 'PGRST116') {
			return { status: 'processing', message: null }
		}
		console.error('Error polling message:', error)
		return { status: 'error', message: null }
	}

	// Check status field
	const status = data.status as string

	if (status === 'completed') {
		return {
			status: 'completed',
			message: {
				id: data.id,
				session_id: data.session_id,
				role: data.role,
				content: data.content,
				content_type: data.content_type || 'text',
				metadata: data.metadata || {},
				agent_name: data.agent_name,
				parent_message_id: data.parent_message_id,
				created_at: data.created_at,
			}
		}
	}

	if (status === 'error') {
		return {
			status: 'error',
			message: {
				id: data.id,
				session_id: data.session_id,
				role: data.role,
				content: data.content || 'Произошла ошибка при обработке запроса',
				content_type: 'text',
				metadata: { error: data.content || 'Unknown error' },
				agent_name: data.agent_name,
				parent_message_id: data.parent_message_id,
				created_at: data.created_at,
			}
		}
	}

	// status === 'processing' or other
	return { status: 'processing', message: null }
}

export async function deleteMessagesFromId(
	sessionId: string,
	messageId: string
): Promise<boolean> {
	const email = await requireAuth()
	const supabase = getChatAdmin()

	// Verify session ownership
	const { data: session } = await supabase
		.from('dashboard_chat_sessions')
		.select('id')
		.eq('id', sessionId)
		.eq('visitor_id', email)
		.single()

	if (!session) {
		console.error('Session not found or not owned by user')
		return false
	}

	// First get the message to find its created_at
	const { data: targetMessage, error: fetchError } = await supabase
		.from('dashboard_chat_messages')
		.select('created_at')
		.eq('id', messageId)
		.single()

	if (fetchError || !targetMessage) {
		console.error('Error fetching target message:', fetchError)
		return false
	}

	// Delete this message and all messages after it
	const { error } = await supabase
		.from('dashboard_chat_messages')
		.delete()
		.eq('session_id', sessionId)
		.gte('created_at', targetMessage.created_at)

	if (error) {
		console.error('Error deleting messages:', error)
		return false
	}

	return true
}
