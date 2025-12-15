/**
 * AI Chat System - TypeScript Types
 */

// === Chat Types ===

export interface ChatSession {
	id: string
	visitor_id: string
	title: string | null
	created_at: string
	updated_at: string
	metadata: Record<string, unknown>
	is_archived: boolean
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export type ContentType = 'text' | 'chart' | 'table' | 'code' | 'mixed' | 'report_link'

export type ChartType = 'bar_chart' | 'line_chart' | 'pie_chart' | 'area_chart'

export interface ChartConfig {
	type: ChartType
	title: string
	description?: string
	xKey: string
	yKey: string | string[]
	colors?: string[]
}

export interface TableConfig {
	columns: string[]
	title?: string
}

export interface VisualizationMetadata {
	chart_type?: ChartType
	data?: Record<string, unknown>[]
	config?: ChartConfig
	columns?: string[]
	title?: string
}

// Report Preview for AI Chat
export interface ReportPreviewCategory {
	name: string
	count: number
	percent: number
}

export interface ReportPreview {
	period: string
	period_days: number
	total_tickets: number
	top_categories: ReportPreviewCategory[]
	patterns_count: number
	executive_summary?: string
	generated_at: string
}

export interface ReportLinkMetadata {
	report_id: number | string
	report_url: string
	preview: ReportPreview
}

export interface ChatMessageMetadata {
	action?: 'SQL_QUERY' | 'ANALYTICS' | 'REPORT' | 'CONVERSATION'
	visualization?: {
		type: 'none' | ChartType | 'table' | 'number' | 'report_card'
		title?: string
		description?: string
	} | string
	data?: Record<string, unknown>[]
	columns?: string[]
	sql_executed?: string
	rows_count?: number
	execution_time_ms?: number
	needs_clarification?: boolean
	clarification_question?: string
	tool?: string
	error?: string
	// Report link metadata
	report_id?: number | string
	report_url?: string
	preview?: ReportPreview
}

export interface ChatMessage {
	id: string
	session_id: string
	role: MessageRole
	content: string
	content_type: ContentType
	metadata: ChatMessageMetadata
	agent_name?: string
	parent_message_id?: string
	created_at: string
}

// === API Request/Response Types ===

export interface SendMessageRequest {
	message: string
	session_id: string
	visitor_id: string
}

export interface ChatResponse {
	success: boolean
	response: {
		content: string
		content_type: ContentType
		metadata: ChatMessageMetadata
	}
	session_id: string
	visitor_id: string
	error?: string
}

// === UI Component Props ===

export interface ChatMessageProps {
	message: ChatMessage
	isLoading?: boolean
}

export interface ChatInputProps {
	onSend: (message: string) => void
	disabled?: boolean
	placeholder?: string
}

export interface ChartDisplayProps {
	data: Record<string, unknown>[]
	config: ChartConfig
	className?: string
}

export interface TableDisplayProps {
	data: Record<string, unknown>[]
	columns: string[]
	title?: string
	className?: string
}

// === Visitor/Session Management ===

export interface VisitorInfo {
	visitor_id: string
	created_at: string
}

export const getOrCreateVisitorId = (): string => {
	if (typeof window === 'undefined') return ''

	let visitorId = localStorage.getItem('chat_visitor_id')
	if (!visitorId) {
		visitorId = crypto.randomUUID()
		localStorage.setItem('chat_visitor_id', visitorId)
		localStorage.setItem('chat_visitor_created', new Date().toISOString())
	}
	return visitorId
}

export const getCurrentSession = (): string | null => {
	if (typeof window === 'undefined') return null
	return localStorage.getItem('current_chat_session')
}

export const setCurrentSession = (sessionId: string): void => {
	if (typeof window === 'undefined') return
	localStorage.setItem('current_chat_session', sessionId)
}

// === Chart Color Palette (vibrant colors for charts) ===

export const CHART_COLORS = [
	'#3b82f6', // Blue (primary)
	'#22c55e', // Green
	'#f97316', // Orange
	'#ec4899', // Pink
	'#06b6d4', // Cyan
	'#ef4444', // Red
	'#8b5cf6', // Purple
	'#84cc16', // Lime
	'#f43f5e', // Rose
	'#14b8a6', // Teal
	'#eab308', // Yellow
	'#6366f1', // Indigo
]

// === Helper Functions ===

export const formatNumber = (num: number): string => {
	return new Intl.NumberFormat('ru-RU').format(num)
}

export const formatPercentage = (num: number): string => {
	return `${num.toFixed(1)}%`
}

export const formatDate = (date: string, locale: string = 'ru'): string => {
	const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US' }
	return new Date(date).toLocaleDateString(localeMap[locale] || 'ru-RU', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

export const formatDateTime = (date: string, locale: string = 'ru'): string => {
	const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US' }
	return new Date(date).toLocaleString(localeMap[locale] || 'ru-RU', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	})
}
