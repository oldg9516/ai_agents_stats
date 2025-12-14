'use server'

import { createClient } from '@supabase/supabase-js'
import { ChatSession, ChatMessage } from '@/types/chat'

// Server-side Supabase client with service role
function getSupabaseAdmin() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
	return createClient(supabaseUrl, supabaseServiceKey)
}

// === Session Actions ===

export async function createChatSession(visitorId: string): Promise<ChatSession | null> {
	const supabase = getSupabaseAdmin()

	const { data, error } = await supabase
		.from('dashboard_chat_sessions')
		.insert({
			visitor_id: visitorId,
			title: null,
			metadata: {},
			is_archived: false,
		})
		.select()
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

export async function getChatSessions(visitorId: string): Promise<ChatSession[]> {
	const supabase = getSupabaseAdmin()

	const { data, error } = await supabase
		.from('dashboard_chat_sessions')
		.select('*')
		.eq('visitor_id', visitorId)
		.eq('is_archived', false)
		.order('updated_at', { ascending: false })
		.limit(50)

	if (error) {
		console.error('Error fetching chat sessions:', error)
		return []
	}

	return data.map(session => ({
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
	const supabase = getSupabaseAdmin()

	const { error } = await supabase
		.from('dashboard_chat_sessions')
		.update({ title, updated_at: new Date().toISOString() })
		.eq('id', sessionId)

	if (error) {
		console.error('Error updating session title:', error)
		return false
	}

	return true
}

export async function deleteSession(sessionId: string): Promise<boolean> {
	const supabase = getSupabaseAdmin()

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

	if (error) {
		console.error('Error deleting session:', error)
		return false
	}

	return true
}

// === Message Actions ===

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
	const supabase = getSupabaseAdmin()

	const { data, error } = await supabase
		.from('dashboard_chat_messages')
		.select('*')
		.eq('session_id', sessionId)
		.order('created_at', { ascending: true })

	if (error) {
		console.error('Error fetching chat messages:', error)
		return []
	}

	return data.map(msg => ({
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
	const supabase = getSupabaseAdmin()

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
		.select()
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

export async function deleteMessagesFromId(
	sessionId: string,
	messageId: string
): Promise<boolean> {
	const supabase = getSupabaseAdmin()

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
