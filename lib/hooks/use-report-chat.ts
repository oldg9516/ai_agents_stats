'use client'

/**
 * Report Chat Hook - Chat specific to backlog report discussion
 * Similar to useChat but scoped to a single report
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
	ChatMessage,
	ChatMessageMetadata,
	getReportChatSession,
	setReportChatSession,
	ReportChatSessionMetadata,
} from '@/types/chat'
import {
	createChatSession,
	getChatMessages,
	saveChatMessage,
	deleteMessagesFromId,
	pollMessageByMessageId,
} from '@/lib/actions/chat-actions'

// Valid content types for database
type ValidContentType = 'text' | 'chart' | 'table' | 'code' | 'mixed' | 'report_link'
const VALID_CONTENT_TYPES: ValidContentType[] = ['text', 'chart', 'table', 'code', 'mixed', 'report_link']

// Configuration
const INITIAL_TIMEOUT = 30000 // 30 seconds
const POLL_INTERVAL = 3000 // 3 seconds
const MAX_POLL_TIME = 5 * 60 * 60 * 1000 // 5 hours

function sanitizeContentType(contentType: string | undefined): ValidContentType {
	if (contentType && VALID_CONTENT_TYPES.includes(contentType as ValidContentType)) {
		return contentType as ValidContentType
	}
	return 'text'
}

interface UseReportChatOptions {
	reportId: string
	reportPeriod: string
	reportTotalTickets: number
	onError?: (error: Error) => void
}

interface UseReportChatReturn {
	messages: ChatMessage[]
	currentSessionId: string | null
	isLoading: boolean
	isInitializing: boolean
	error: string | null
	sendMessage: (content: string) => Promise<void>
	resendMessage: (messageId: string) => Promise<void>
	editAndResendMessage: (messageId: string, newContent: string) => Promise<void>
	clearError: () => void
}

export function useReportChat({
	reportId,
	reportPeriod,
	reportTotalTickets,
	onError,
}: UseReportChatOptions): UseReportChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isInitializing, setIsInitializing] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const abortControllerRef = useRef<AbortController | null>(null)
	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const isInitializedRef = useRef(false)

	// Use API route (same as main chat - API route proxies to CHAT_WEBHOOK_URL)
	const webhookUrl = '/api/chat'

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current)
			}
		}
	}, [])

	// Initialize - load or create session for this report
	useEffect(() => {
		if (isInitializedRef.current) return
		isInitializedRef.current = true

		const init = async () => {
			try {
				// Check for existing session for this report
				const existingSessionId = getReportChatSession(reportId)

				if (existingSessionId) {
					// Load existing session messages
					const dbMessages = await getChatMessages(existingSessionId)
					if (dbMessages.length > 0) {
						setCurrentSessionId(existingSessionId)
						setMessages(dbMessages)
					} else {
						// Session exists but empty - might have been deleted, create new
						await createSessionForReport()
					}
				} else {
					// No existing session - create one
					await createSessionForReport()
				}
			} finally {
				setIsInitializing(false)
			}
		}

		const createSessionForReport = async () => {
			const metadata: ReportChatSessionMetadata = {
				type: 'report_chat',
				report_id: reportId,
				report_period: reportPeriod,
				report_total_tickets: reportTotalTickets,
			}

			const newSession = await createChatSession(
				`Report: ${reportPeriod}`,
				metadata
			)

			if (newSession) {
				setCurrentSessionId(newSession.id)
				setReportChatSession(reportId, newSession.id)
				setMessages([])
			}
		}

		init()
	}, [reportId, reportPeriod, reportTotalTickets])

	// Load messages for session
	const loadMessages = useCallback(async (sessionId: string) => {
		const dbMessages = await getChatMessages(sessionId)
		setMessages(dbMessages)
	}, [])

	// Poll for response
	const pollForResponse = useCallback(
		async (messageId: string): Promise<ChatMessage | null> => {
			const startTime = Date.now()

			return new Promise((resolve) => {
				const checkForResponse = async () => {
					if (Date.now() - startTime > MAX_POLL_TIME) {
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current)
							pollIntervalRef.current = null
						}
						resolve(null)
						return
					}

					const result = await pollMessageByMessageId(messageId)

					if (result.status === 'completed' && result.message) {
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current)
							pollIntervalRef.current = null
						}
						resolve(result.message)
						return
					}

					if (result.status === 'error') {
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current)
							pollIntervalRef.current = null
						}
						resolve(result.message)
						return
					}
				}

				pollIntervalRef.current = setInterval(checkForResponse, POLL_INTERVAL)
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

			let sessionId = currentSessionId

			// Create session if needed
			if (!sessionId) {
				const metadata: ReportChatSessionMetadata = {
					type: 'report_chat',
					report_id: reportId,
					report_period: reportPeriod,
					report_total_tickets: reportTotalTickets,
				}

				const newSession = await createChatSession(
					`Report: ${reportPeriod}`,
					metadata
				)

				if (!newSession) {
					setError('Failed to create session')
					return
				}

				sessionId = newSession.id
				setCurrentSessionId(sessionId)
				setReportChatSession(reportId, sessionId)
			}

			// Cancel pending request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
			abortControllerRef.current = new AbortController()

			// Save user message
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

			setMessages(prev => [...prev, savedUserMessage])
			setIsLoading(true)
			setError(null)

			let responseContent = ''
			let finalMetadata: ChatMessageMetadata = {}
			let finalContentType: ValidContentType = 'text'
			let gotResponseFromWebhook = false

			const generatedMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
			let pollingMessageId: string | null = generatedMessageId

			try {
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
							user_message_id: savedUserMessage.id,
							message_id: generatedMessageId,
							// Report-specific context
							report_id: reportId,
							report_period: reportPeriod,
							report_total_tickets: reportTotalTickets,
							chat_type: 'report_chat',
						}),
						signal: timeoutController.signal,
					})

					clearTimeout(timeoutId)

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`)
					}

					const text = await response.text()
					if (!text || text.trim() === '') {
						throw new Error('Empty response from server')
					}

					let data
					try {
						data = JSON.parse(text)
					} catch {
						throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`)
					}

					if (data.success === false) {
						throw new Error(data.error || 'Unknown error occurred')
					}

					// Check for async/polling mode
					if (data.async === true || data.polling === true || data.status === 'processing') {
						gotResponseFromWebhook = false
						pollingMessageId = data.message_id || generatedMessageId
					} else {
						if (data.response) {
							responseContent = data.response.content || ''
							finalMetadata = data.response.metadata || {}
							finalContentType = sanitizeContentType(data.response.content_type)
						} else {
							responseContent = data.content || data.message || data.output || JSON.stringify(data)
							finalMetadata = data.metadata || {}
							finalContentType = sanitizeContentType(data.content_type)
						}
						gotResponseFromWebhook = true
					}
				} catch (err) {
					clearTimeout(timeoutId)
					if (err instanceof Error && err.name === 'AbortError') {
						console.log('Initial request timed out, starting to poll...')
						gotResponseFromWebhook = false
					} else {
						throw err
					}
				}

				if (gotResponseFromWebhook) {
					const savedAssistantMessage = await saveChatMessage({
						session_id: sessionId,
						role: 'assistant',
						content: responseContent,
						content_type: finalContentType,
						metadata: finalMetadata,
						agent_name: 'report_assistant',
					})

					if (savedAssistantMessage) {
						setMessages(prev => [...prev, savedAssistantMessage])
					}
				} else {
					console.log('Polling for response with message_id:', pollingMessageId)
					const assistantMessage = await pollForResponse(pollingMessageId!)

					if (assistantMessage) {
						setMessages(prev => [...prev, assistantMessage])
					} else {
						throw new Error('Request timed out. Please try again.')
					}
				}
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') {
					return
				}

				const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
				setError(errorMessage)
				onError?.(err instanceof Error ? err : new Error(errorMessage))

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
		[currentSessionId, webhookUrl, reportId, reportPeriod, reportTotalTickets, onError, pollForResponse]
	)

	// Clear error
	const clearError = useCallback(() => {
		setError(null)
	}, [])

	// Delete messages from ID
	const deleteMessagesFrom = useCallback(
		async (messageId: string) => {
			if (!currentSessionId) return

			const success = await deleteMessagesFromId(currentSessionId, messageId)
			if (success) {
				await loadMessages(currentSessionId)
			}
		},
		[currentSessionId, loadMessages]
	)

	// Resend message
	const resendMessage = useCallback(
		async (messageId: string) => {
			const message = messages.find(m => m.id === messageId)
			if (!message || message.role !== 'user') return

			const content = message.content
			await deleteMessagesFrom(messageId)
			await sendMessage(content)
		},
		[messages, deleteMessagesFrom, sendMessage]
	)

	// Edit and resend
	const editAndResendMessage = useCallback(
		async (messageId: string, newContent: string) => {
			const message = messages.find(m => m.id === messageId)
			if (!message || message.role !== 'user') return

			await deleteMessagesFrom(messageId)
			await sendMessage(newContent)
		},
		[messages, deleteMessagesFrom, sendMessage]
	)

	return {
		messages,
		currentSessionId,
		isLoading,
		isInitializing,
		error,
		sendMessage,
		resendMessage,
		editAndResendMessage,
		clearError,
	}
}
