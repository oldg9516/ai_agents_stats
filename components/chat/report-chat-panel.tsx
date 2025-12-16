'use client'

/**
 * Report Chat Panel - Sidebar chat for backlog report discussion
 */

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useReportChat } from '@/lib/hooks/use-report-chat'
import { BacklogReport } from '@/lib/supabase/types'
import {
	clearReportChatContext,
	getReportChatContext,
	TicketSource,
} from '@/types/chat'
import {
	IconChevronLeft,
	IconChevronRight,
	IconSend,
	IconSparkles,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import React, {
	FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { ChatMessageDisplay, LoadingMessage } from './chat-message'
import { TicketSourcesAccordion } from './ticket-sources'

// Resize constraints
const MIN_WIDTH = 350
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 450

interface ReportChatPanelProps {
	report: BacklogReport
	isOpen: boolean
	onToggle: () => void
	onWidthChange?: (width: number) => void
	className?: string
}

/**
 * Generate smart suggested questions based on report data
 */
function generateSuggestedQuestions(
	report: BacklogReport,
	t: (key: string, values?: Record<string, string>) => string
): string[] {
	const suggestions: string[] = []

	// Safely parse patterns if they're strings
	const patterns =
		typeof report.main_patterns === 'string'
			? JSON.parse(report.main_patterns)
			: report.main_patterns || []

	const trends =
		typeof report.temporal_trends === 'string'
			? JSON.parse(report.temporal_trends)
			: report.temporal_trends || []

	const issues =
		typeof report.specific_issues === 'string'
			? JSON.parse(report.specific_issues)
			: report.specific_issues || []

	// Based on top pattern
	if (patterns[0]?.pattern_name) {
		suggestions.push(
			t('suggestions.whyPattern', { pattern: patterns[0].pattern_name })
		)
	}

	// Based on trends
	if (trends[0]?.observation) {
		const shortObs =
			trends[0].observation.length > 50
				? trends[0].observation.slice(0, 50) + '...'
				: trends[0].observation
		suggestions.push(t('suggestions.explainTrend', { trend: shortObs }))
	}

	// Based on issues
	if (issues[0]?.issue) {
		suggestions.push(
			t('suggestions.ticketsForIssue', { issue: issues[0].issue })
		)
	}

	// Generic suggestions
	suggestions.push(t('suggestions.urgentCategories'))
	suggestions.push(t('suggestions.showExamples'))

	return suggestions.slice(0, 4)
}

export function ReportChatPanel({
	report,
	isOpen,
	onToggle,
	onWidthChange,
	className = '',
}: ReportChatPanelProps) {
	const t = useTranslations('reportChat')
	const [inputValue, setInputValue] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const [initialContextApplied, setInitialContextApplied] = useState(false)

	// Resize state
	const [width, setWidth] = useState(DEFAULT_WIDTH)
	const [isResizing, setIsResizing] = useState(false)
	const resizeRef = useRef<HTMLDivElement>(null)
	const onWidthChangeRef = useRef(onWidthChange)

	// Keep callback ref updated
	useEffect(() => {
		onWidthChangeRef.current = onWidthChange
	}, [onWidthChange])

	// Handle resize
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setIsResizing(true)
	}, [])

	useEffect(() => {
		if (!isResizing) return

		const handleMouseMove = (e: MouseEvent) => {
			// Calculate new width (panel is on the right, so we subtract from window width)
			const newWidth = window.innerWidth - e.clientX
			const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH)
			setWidth(clampedWidth)
			// Use ref to avoid effect dependency on callback
			onWidthChangeRef.current?.(clampedWidth)
		}

		const handleMouseUp = () => {
			setIsResizing(false)
		}

		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)

		// Prevent text selection during resize
		document.body.style.userSelect = 'none'
		document.body.style.cursor = 'ew-resize'

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
			document.body.style.userSelect = ''
			document.body.style.cursor = ''
		}
	}, [isResizing])

	const {
		messages,
		isLoading,
		isInitializing,
		sendMessage,
		resendMessage,
		editAndResendMessage,
	} = useReportChat({
		reportId: report.id,
		reportPeriod: `${report.date_from} - ${report.date_to}`,
		reportTotalTickets: report.total_tickets,
		onError: err => console.error('Report chat error:', err),
	})

	// Generate suggested questions
	const suggestions = generateSuggestedQuestions(report, t)

	// Handle redirect context from main chat - just clear it and focus input
	useEffect(() => {
		if (initialContextApplied || !isOpen) return

		const context = getReportChatContext()
		if (context && context.report_id === report.id && context.from_main_chat) {
			// Clear context and focus input for user to start fresh conversation
			clearReportChatContext()
			// Use setTimeout to avoid setState in effect body
			setTimeout(() => {
				setInitialContextApplied(true)
				inputRef.current?.focus()
			}, 0)
		}
	}, [isOpen, report.id, initialContextApplied])

	// Auto-scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages, isLoading])

	// Handle submit
	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		if (!inputValue.trim() || isLoading) return

		const message = inputValue.trim()
		setInputValue('')
		await sendMessage(message)
		inputRef.current?.focus()
	}

	// Handle Enter key (Shift+Enter for new line)
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}

	// Auto-resize textarea
	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputValue(e.target.value)
		e.target.style.height = 'auto'
		e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`
	}

	// Toggle button when closed
	if (!isOpen) {
		return (
			<Button
				variant='default'
				size='sm'
				onClick={onToggle}
				className={`fixed right-4 bottom-4 z-50 bg-orange-500 hover:bg-orange-600 text-white shadow-lg ${className}`}
			>
				<IconSparkles className='w-4 h-4 mr-2' />
				{t('openChat')}
				<IconChevronLeft className='w-4 h-4 ml-2' />
			</Button>
		)
	}

	return (
		<div
			className={`flex h-full bg-background ${className}`}
			style={{ width: `${width}px` }}
		>
			{/* Resize Handle */}
			<div
				ref={resizeRef}
				onMouseDown={handleMouseDown}
				className={`w-1 h-full cursor-ew-resize hover:bg-orange-500/50 transition-colors flex-shrink-0 ${
					isResizing ? 'bg-orange-500' : 'bg-border'
				}`}
				title={t('resizeHandle')}
			/>

			{/* Chat Content */}
			<div className='flex flex-col flex-1 min-w-0 border-l'>
				{/* Header */}
				<div className='flex items-center justify-between px-4 py-3 border-b bg-card h-[56px]'>
					<div className='flex items-center gap-2'>
						<div className='p-1.5 bg-orange-500 rounded-md'>
							<IconSparkles className='w-4 h-4 text-white' />
						</div>
						<div>
							<h3 className='text-sm font-semibold'>{t('title')}</h3>
							<p className='text-xs text-muted-foreground'>
								{report.total_tickets.toLocaleString()} {t('tickets')}
							</p>
						</div>
					</div>
					<Button
						variant='ghost'
						size='icon'
						onClick={onToggle}
						className='h-8 w-8'
					>
						<IconChevronRight className='w-4 h-4' />
					</Button>
				</div>

				{/* Messages Area */}
				<div className='flex-1 overflow-y-auto px-4 py-3'>
					{isInitializing ? (
						<div className='flex justify-center items-center h-full'>
							<Spinner className='size-6 text-orange-500' />
						</div>
					) : messages.length === 0 ? (
						// Empty state with suggestions
						<div className='flex flex-col h-full'>
							<div className='flex-1 flex flex-col items-center justify-center text-center px-4'>
								<div className='p-3 bg-orange-100 dark:bg-orange-950 rounded-full mb-3'>
									<IconSparkles className='w-6 h-6 text-orange-600 dark:text-orange-400' />
								</div>
								<h4 className='text-sm font-semibold mb-1'>
									{t('emptyTitle')}
								</h4>
								<p className='text-xs text-muted-foreground mb-4'>
									{t('emptyDescription')}
								</p>
							</div>

							{/* Suggestions */}
							<div className='space-y-2'>
								<p className='text-xs text-muted-foreground font-medium'>
									{t('trySuggestions')}
								</p>
								{suggestions.map((suggestion, idx) => (
									<Button
										key={idx}
										variant='outline'
										size='sm'
										onClick={() => {
											setInputValue(suggestion)
											inputRef.current?.focus()
										}}
										className='w-full justify-start text-left text-xs h-auto py-2 px-3 whitespace-normal'
									>
										{suggestion}
									</Button>
								))}
							</div>
						</div>
					) : (
						// Messages list
						<>
							{messages.map((message, index) => {
								// Find previous user message for error retry
								let previousUserMessageId: string | undefined
								if (message.metadata?.error) {
									for (let i = index - 1; i >= 0; i--) {
										if (messages[i].role === 'user') {
											previousUserMessageId = messages[i].id
											break
										}
									}
								}

								// Check for sources in metadata
								const sources = (
									message.metadata as { sources?: TicketSource[] }
								)?.sources

								return (
									<div key={message.id}>
										<ChatMessageDisplay
											message={message}
											onResend={resendMessage}
											onEdit={editAndResendMessage}
											isLoading={isLoading}
											previousUserMessageId={previousUserMessageId}
										/>
										{/* Show sources accordion for assistant messages with sources */}
										{message.role === 'assistant' &&
											sources &&
											sources.length > 0 && (
												<TicketSourcesAccordion sources={sources} />
											)}
									</div>
								)
							})}
							{isLoading && <LoadingMessage />}
							<div ref={messagesEndRef} />
						</>
					)}
				</div>

				{/* Input Area */}
				<div className='px-4 py-3 border-t bg-card'>
					<form onSubmit={handleSubmit} className='flex items-end gap-2'>
						<div className='flex-1'>
							<Textarea
								ref={inputRef}
								value={inputValue}
								onChange={handleInputChange}
								onKeyDown={handleKeyDown}
								placeholder={t('placeholder')}
								disabled={isLoading}
								rows={1}
								className='resize-none min-h-[40px] max-h-[150px] text-sm'
							/>
						</div>
						<Button
							type='submit'
							disabled={!inputValue.trim() || isLoading}
							size='icon'
							className='h-10 w-10 bg-orange-500 hover:bg-orange-600 text-white shrink-0'
						>
							<IconSend className='w-4 h-4' />
						</Button>
					</form>
				</div>
			</div>
		</div>
	)
}
