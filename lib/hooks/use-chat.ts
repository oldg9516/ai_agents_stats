'use client'

/**
 * AI Chat System - Chat Hook with Supabase Storage
 * Supports long-running requests via polling
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
	ChatMessage,
	ChatSession,
	ChatResponse,
	ChatMessageMetadata,
	getOrCreateVisitorId,
	getCurrentSession,
	setCurrentSession,
} from '@/types/chat'
import {
	createChatSession,
	getChatSessions,
	getChatMessages,
	saveChatMessage,
	deleteMessagesFromId,
	updateSessionTitle,
	deleteSession,
	pollMessageByMessageId,
} from '@/lib/actions/chat-actions'

// Valid content types for database
type ValidContentType = 'text' | 'chart' | 'table' | 'code' | 'mixed'
const VALID_CONTENT_TYPES: ValidContentType[] = ['text', 'chart', 'table', 'code', 'mixed']

// Configuration
const INITIAL_TIMEOUT = 30000 // 30 seconds - wait for quick responses
const POLL_INTERVAL = 3000 // 3 seconds between polls
const MAX_POLL_TIME = 5 * 60 * 60 * 1000 // 5 hours max polling

// Sanitize content type to ensure it's valid for database
function sanitizeContentType(contentType: string | undefined): ValidContentType {
	if (contentType && VALID_CONTENT_TYPES.includes(contentType as ValidContentType)) {
		return contentType as ValidContentType
	}
	// Map unknown types to 'text' (e.g., 'number' -> 'text')
	return 'text'
}

interface UseChatOptions {
	webhookUrl: string
	onError?: (error: Error) => void
}

interface UseChatReturn {
	messages: ChatMessage[]
	sessions: ChatSession[]
	currentSessionId: string | null
	isLoading: boolean
	error: string | null
	sendMessage: (content: string) => Promise<void>
	resendMessage: (messageId: string) => Promise<void>
	editAndResendMessage: (messageId: string, newContent: string) => Promise<void>
	deleteMessagesFrom: (messageId: string) => Promise<void>
	createNewSession: () => Promise<string>
	switchSession: (sessionId: string) => Promise<void>
	loadSessions: () => Promise<void>
	clearError: () => void
	renameSession: (sessionId: string, title: string) => Promise<void>
	removeSession: (sessionId: string) => Promise<void>
}

export function useChat({ webhookUrl, onError }: UseChatOptions): UseChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [sessions, setSessions] = useState<ChatSession[]>([])
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const visitorIdRef = useRef<string>('')
	const abortControllerRef = useRef<AbortController | null>(null)
	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const isInitializedRef = useRef(false)

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current)
			}
		}
	}, [])

	// Initialize visitor ID and load sessions
	useEffect(() => {
		if (isInitializedRef.current) return
		isInitializedRef.current = true

		const init = async () => {
			visitorIdRef.current = getOrCreateVisitorId()
			if (!visitorIdRef.current) return

			// Load sessions from database
			const dbSessions = await getChatSessions(visitorIdRef.current)
			setSessions(dbSessions)

			// Restore last session
			const savedSession = getCurrentSession()
			if (savedSession) {
				const sessionExists = dbSessions.some(s => s.id === savedSession)
				if (sessionExists) {
					setCurrentSessionId(savedSession)
					const dbMessages = await getChatMessages(savedSession)
					setMessages(dbMessages)
				}
			}
		}

		init()
	}, [])

	// Load messages for a session
	const loadMessages = useCallback(async (sessionId: string) => {
		const dbMessages = await getChatMessages(sessionId)
		setMessages(dbMessages)
	}, [])

	// Create new session
	const createNewSession = useCallback(async (): Promise<string> => {
		const newSession = await createChatSession(visitorIdRef.current)

		if (!newSession) {
			throw new Error('Failed to create session')
		}

		setSessions(prev => [newSession, ...prev])
		setCurrentSessionId(newSession.id)
		setCurrentSession(newSession.id)
		setMessages([])

		return newSession.id
	}, [])

	// Switch session
	const switchSession = useCallback(
		async (sessionId: string) => {
			setCurrentSessionId(sessionId)
			setCurrentSession(sessionId)
			await loadMessages(sessionId)
		},
		[loadMessages]
	)

	// Load all sessions
	const loadSessions = useCallback(async () => {
		if (!visitorIdRef.current) return
		const dbSessions = await getChatSessions(visitorIdRef.current)
		setSessions(dbSessions)
	}, [])

	// Poll database for assistant message by message_id
	const pollForResponse = useCallback(
		async (messageId: string): Promise<ChatMessage | null> => {
			const startTime = Date.now()

			return new Promise((resolve) => {
				const checkForResponse = async () => {
					// Check if we've exceeded max poll time
					if (Date.now() - startTime > MAX_POLL_TIME) {
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current)
							pollIntervalRef.current = null
						}
						resolve(null)
						return
					}

					// Poll by message_id
					const result = await pollMessageByMessageId(messageId)

					if (result.status === 'completed' && result.message) {
						// Found completed response!
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current)
							pollIntervalRef.current = null
						}
						resolve(result.message)
						return
					}

					if (result.status === 'error') {
						// Error occurred
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current)
							pollIntervalRef.current = null
						}
						resolve(result.message) // Contains error message
						return
					}

					// status === 'processing' - continue polling
				}

				// Start polling
				pollIntervalRef.current = setInterval(checkForResponse, POLL_INTERVAL)
				// Also check immediately
				checkForResponse()
			})
		},
		[]
	)

	// Send message
	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim()) return

			// Stop any existing polling
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current)
				pollIntervalRef.current = null
			}

			// Ensure we have a session
			let sessionId = currentSessionId
			if (!sessionId) {
				sessionId = await createNewSession()
			}

			// Cancel any pending request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
			abortControllerRef.current = new AbortController()

			// Save user message to database
			const savedUserMessage = await saveChatMessage({
				session_id: sessionId,
				role: 'user',
				content: content.trim(),
				content_type: 'text',
				metadata: {},
			})

			if (!savedUserMessage) {
				setError('Failed to save message')
				return
			}

			// Add user message to state
			setMessages(prev => [...prev, savedUserMessage])

			// Update session title if it's the first message
			const isFirstMessage = messages.length === 0
			if (isFirstMessage) {
				const title = content.trim().slice(0, 50) + (content.length > 50 ? '...' : '')
				await updateSessionTitle(sessionId, title)
				setSessions(prev =>
					prev.map(s => (s.id === sessionId ? { ...s, title } : s))
				)
			}

			setIsLoading(true)
			setError(null)

			let responseContent = ''
			let finalMetadata: ChatMessageMetadata = {}
			let finalContentType: 'text' | 'chart' | 'table' | 'code' | 'mixed' = 'text'
			let gotResponseFromWebhook = false

			// Generate message_id for polling (n8n will use this to save response)
			const generatedMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
			let pollingMessageId: string | null = generatedMessageId

			try {
				// Create timeout for initial request
				const timeoutController = new AbortController()
				const timeoutId = setTimeout(() => timeoutController.abort(), INITIAL_TIMEOUT)

				try {
					const response = await fetch(webhookUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							message: content.trim(),
							session_id: sessionId,
							visitor_id: visitorIdRef.current,
							user_message_id: savedUserMessage.id,
							message_id: generatedMessageId, // ID for n8n to use when saving response
						}),
						signal: timeoutController.signal,
					})

					clearTimeout(timeoutId)

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`)
					}

					const contentType = response.headers.get('content-type') || ''

					// Check if streaming response (text/event-stream)
					if (contentType.includes('text/event-stream')) {
						// For streaming - create temporary message to show progress
						const tempMessageId = `temp-${Date.now()}`
						setMessages(prev => [
							...prev,
							{
								id: tempMessageId,
								session_id: sessionId,
								role: 'assistant',
								content: '',
								content_type: 'text',
								metadata: {},
								created_at: new Date().toISOString(),
							},
						])

						// Handle streaming response
						const reader = response.body?.getReader()
						if (!reader) {
							setMessages(prev => prev.filter(msg => msg.id !== tempMessageId))
							throw new Error('No response body')
						}

						const decoder = new TextDecoder()

						try {
							while (true) {
								const { done, value } = await reader.read()
								if (done) break

								const chunk = decoder.decode(value, { stream: true })

								// Parse SSE format: data: {...}\n\n
								const lines = chunk.split('\n')
								for (const line of lines) {
									if (line.startsWith('data: ')) {
										const dataStr = line.slice(6).trim()
										if (dataStr === '[DONE]') continue

										try {
											const data = JSON.parse(dataStr)
											if (data.content) {
												responseContent += data.content
											}
											if (data.metadata) {
												finalMetadata = { ...finalMetadata, ...data.metadata }
											}
											if (data.content_type) {
												finalContentType = sanitizeContentType(data.content_type)
											}
										} catch {
											// If not JSON, treat as plain text chunk
											responseContent += dataStr
										}
									} else if (line.trim() && !line.startsWith(':')) {
										// Plain text chunk (not SSE format)
										responseContent += line
									}
								}

								// Update the temporary message with streamed content
								setMessages(prev =>
									prev.map(msg =>
										msg.id === tempMessageId
											? { ...msg, content: responseContent }
											: msg
									)
								)
							}
						} finally {
							// Remove temporary message after streaming
							setMessages(prev => prev.filter(msg => msg.id !== tempMessageId))
						}
						gotResponseFromWebhook = true
					} else {
						// Handle regular JSON response (no streaming, no temp message)
						const text = await response.text()
						if (!text || text.trim() === '') {
							throw new Error('Empty response from server')
						}

						let data: ChatResponse
						try {
							data = JSON.parse(text)
						} catch {
							throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`)
						}

						// Handle different response formats from n8n
						if (data.success === false) {
							throw new Error(data.error || 'Unknown error occurred')
						}

						// Check if n8n signals it will save response itself (polling mode)
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const anyData = data as any
						if (anyData.async === true || anyData.polling === true || anyData.status === 'processing') {
							// n8n will save response to DB, start polling
							gotResponseFromWebhook = false
							// Use message_id from n8n response if available, otherwise use generated one
							pollingMessageId = anyData.message_id || generatedMessageId
						} else {
							// Support both nested response format and flat format
							if (data.response) {
								responseContent = data.response.content || ''
								finalMetadata = data.response.metadata || {}
								finalContentType = sanitizeContentType(data.response.content_type)
							} else {
								// Fallback: if response is flat (direct content from n8n)
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								const flatData = data as any
								responseContent = flatData.content || flatData.message || flatData.output || JSON.stringify(data)
								finalMetadata = flatData.metadata || {}
								finalContentType = sanitizeContentType(flatData.content_type)
							}
							gotResponseFromWebhook = true
						}
					}
				} catch (err) {
					clearTimeout(timeoutId)

					// If timeout - start polling
					if (err instanceof Error && err.name === 'AbortError') {
						console.log('Initial request timed out, starting to poll database...')
						gotResponseFromWebhook = false
					} else {
						throw err
					}
				}

				if (gotResponseFromWebhook) {
					// Save final assistant message to database
					const savedAssistantMessage = await saveChatMessage({
						session_id: sessionId,
						role: 'assistant',
						content: responseContent,
						content_type: finalContentType,
						metadata: finalMetadata,
						agent_name: 'orchestrator',
					})

					if (savedAssistantMessage) {
						setMessages(prev => [...prev, savedAssistantMessage])
					}
				} else {
					// Poll database for response (n8n will save it when ready)
					console.log('Polling for response with message_id:', pollingMessageId)
					const assistantMessage = await pollForResponse(pollingMessageId!)

					if (assistantMessage) {
						setMessages(prev => [...prev, assistantMessage])
					} else {
						// Polling timed out after MAX_POLL_TIME
						throw new Error('Request timed out. Please try again.')
					}
				}
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') {
					return // Request was cancelled by user
				}

				const errorMessage =
					err instanceof Error ? err.message : 'Failed to send message'
				setError(errorMessage)
				onError?.(err instanceof Error ? err : new Error(errorMessage))

				// Save error message to database
				const savedErrorMessage = await saveChatMessage({
					session_id: sessionId,
					role: 'assistant',
					content: `Ошибка: ${errorMessage}`,
					content_type: 'text',
					metadata: { error: errorMessage },
				})

				if (savedErrorMessage) {
					setMessages(prev => [...prev, savedErrorMessage])
				}
			} finally {
				setIsLoading(false)
				abortControllerRef.current = null
			}
		},
		[currentSessionId, createNewSession, webhookUrl, onError, messages.length, pollForResponse]
	)

	// Clear error
	const clearError = useCallback(() => {
		setError(null)
	}, [])

	// Delete messages from a specific message (inclusive) - removes that message and all after it
	const deleteMessagesFrom = useCallback(
		async (messageId: string) => {
			if (!currentSessionId) return

			const success = await deleteMessagesFromId(currentSessionId, messageId)
			if (success) {
				// Reload messages from database
				await loadMessages(currentSessionId)
			}
		},
		[currentSessionId, loadMessages]
	)

	// Resend a user message (delete it and its response, then send again)
	const resendMessage = useCallback(
		async (messageId: string) => {
			const message = messages.find(m => m.id === messageId)
			if (!message || message.role !== 'user') return

			const content = message.content

			// Delete this message and everything after it
			await deleteMessagesFrom(messageId)

			// Send again
			await sendMessage(content)
		},
		[messages, deleteMessagesFrom, sendMessage]
	)

	// Edit and resend a user message
	const editAndResendMessage = useCallback(
		async (messageId: string, newContent: string) => {
			const message = messages.find(m => m.id === messageId)
			if (!message || message.role !== 'user') return

			// Delete this message and everything after it
			await deleteMessagesFrom(messageId)

			// Send new content
			await sendMessage(newContent)
		},
		[messages, deleteMessagesFrom, sendMessage]
	)

	// Rename a session
	const renameSession = useCallback(
		async (sessionId: string, title: string) => {
			const success = await updateSessionTitle(sessionId, title)
			if (success) {
				setSessions(prev =>
					prev.map(s => (s.id === sessionId ? { ...s, title } : s))
				)
			}
		},
		[]
	)

	// Remove a session
	const removeSession = useCallback(
		async (sessionId: string) => {
			const success = await deleteSession(sessionId)
			if (success) {
				setSessions(prev => prev.filter(s => s.id !== sessionId))
				// If we deleted the current session, clear it
				if (currentSessionId === sessionId) {
					setCurrentSessionId(null)
					setCurrentSession('')
					setMessages([])
				}
			}
		},
		[currentSessionId]
	)

	return {
		messages,
		sessions,
		currentSessionId,
		isLoading,
		error,
		sendMessage,
		resendMessage,
		editAndResendMessage,
		deleteMessagesFrom,
		createNewSession,
		switchSession,
		loadSessions,
		clearError,
		renameSession,
		removeSession,
	}
}
