'use client'

/**
 * AI Chat System - Main Chat Component
 */

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useChat } from '@/lib/hooks/use-chat'
import {
	IconCheck,
	IconDatabase,
	IconMessage,
	IconMessages,
	IconPencil,
	IconPlus,
	IconSend,
	IconSparkles,
	IconTrash,
	IconX,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { ChatMessageDisplay, LoadingMessage } from './chat-message'

interface AIChatProps {
	webhookUrl: string
	className?: string
}

export function AIChat({ webhookUrl, className = '' }: AIChatProps) {
	const t = useTranslations('chat')
	const [inputValue, setInputValue] = useState('')
	const [showHistory, setShowHistory] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)

	const {
		messages,
		sessions,
		currentSessionId,
		isLoading,
		isInitializing,
		sendMessage,
		resendMessage,
		editAndResendMessage,
		createNewSession,
		switchSession,
		renameSession,
		removeSession,
	} = useChat({
		webhookUrl,
		onError: err => console.error('Chat error:', err),
	})

	// State for editing session title
	const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
	const [editingTitle, setEditingTitle] = useState('')
	const editInputRef = useRef<HTMLInputElement>(null)

	// State for delete confirmation dialog
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [sessionToDelete, setSessionToDelete] = useState<{
		id: string
		title: string | null
	} | null>(null)

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
		e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
	}

	// Quick suggestion buttons
	const suggestions = [
		t('suggestions.ticketsLastWeek'),
		t('suggestions.topRequestTypes'),
		t('suggestions.avgSimilarity'),
		t('suggestions.ticketsDynamic'),
	]

	const handleSelectSession = async (sessionId: string) => {
		await switchSession(sessionId)
		setShowHistory(false)
	}

	const handleNewChat = async () => {
		await createNewSession()
		setShowHistory(false)
	}

	// Handle starting edit mode for session title
	const handleStartEdit = (sessionId: string, currentTitle: string | null) => {
		setEditingSessionId(sessionId)
		setEditingTitle(currentTitle || '')
		setTimeout(() => editInputRef.current?.focus(), 0)
	}

	// Handle saving edited session title
	const handleSaveEdit = async () => {
		if (editingSessionId && editingTitle.trim()) {
			await renameSession(editingSessionId, editingTitle.trim())
		}
		setEditingSessionId(null)
		setEditingTitle('')
	}

	// Handle canceling edit mode
	const handleCancelEdit = () => {
		setEditingSessionId(null)
		setEditingTitle('')
	}

	// Handle opening delete confirmation dialog
	const handleDeleteClick = (sessionId: string, title: string | null) => {
		setSessionToDelete({ id: sessionId, title })
		setDeleteDialogOpen(true)
	}

	// Handle confirming deletion
	const handleConfirmDelete = async () => {
		if (sessionToDelete) {
			await removeSession(sessionToDelete.id)
		}
		setDeleteDialogOpen(false)
		setSessionToDelete(null)
	}

	// Handle canceling deletion
	const handleCancelDelete = () => {
		setDeleteDialogOpen(false)
		setSessionToDelete(null)
	}

	// Show spinner while initializing
	if (isInitializing) {
		return (
			<div className='flex justify-center items-center w-full h-full'>
				<Spinner className='size-8 text-orange-500' />
			</div>
		)
	}

	return (
		<div className={`flex h-full ${className}`}>
			{/* History Sidebar */}
			<div
				className={`bg-card border-r flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
					showHistory ? 'w-72' : 'w-0 border-r-0'
				}`}
			>
				<div className='w-72 flex flex-col h-full'>
					{/* Sidebar Header */}
					<div className='flex items-center justify-between px-6 py-4 border-b'>
						<h3 className='text-lg font-semibold'>{t('history')}</h3>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => setShowHistory(false)}
							className='h-8 w-8'
						>
							<IconX className='w-4 h-4' />
						</Button>
					</div>

					{/* New Chat Button */}
					<div className='p-3'>
						<Button onClick={handleNewChat} className='w-full' size='sm'>
							<IconPlus className='w-4 h-4 mr-2' />
							{t('newChat')}
						</Button>
					</div>

					{/* Sessions List */}
					<div className='flex-1 overflow-y-auto px-2 pb-4'>
						{sessions.length === 0 ? (
							<p className='text-sm text-muted-foreground text-center py-4'>
								{t('emptyTitle')}
							</p>
						) : (
							sessions.map(session => (
								<div
									key={session.id}
									className={`group flex items-center mb-1 rounded-md ${
										currentSessionId === session.id
											? 'bg-secondary'
											: 'hover:bg-accent'
									}`}
								>
									{editingSessionId === session.id ? (
										// Edit mode
										<div className='flex items-center w-full px-2 py-1.5 gap-1'>
											<input
												ref={editInputRef}
												type='text'
												value={editingTitle}
												onChange={e => setEditingTitle(e.target.value)}
												onKeyDown={e => {
													if (e.key === 'Enter') handleSaveEdit()
													if (e.key === 'Escape') handleCancelEdit()
												}}
												className='flex-1 text-sm bg-background border rounded px-2 py-1 min-w-0'
											/>
											<Button
												variant='ghost'
												size='icon'
												className='h-7 w-7 shrink-0'
												onClick={handleSaveEdit}
											>
												<IconCheck className='w-4 h-4' />
											</Button>
											<Button
												variant='ghost'
												size='icon'
												className='h-7 w-7 shrink-0'
												onClick={handleCancelEdit}
											>
												<IconX className='w-4 h-4' />
											</Button>
										</div>
									) : (
										// Normal mode
										<>
											<Button
												variant='ghost'
												onClick={() => handleSelectSession(session.id)}
												className='flex-1 justify-start h-auto py-2 px-2 min-w-0'
											>
												<IconMessage className='w-4 h-4 mr-2 shrink-0' />
												<span className='truncate text-sm text-left'>
													{session.title || t('newChat')}
												</span>
											</Button>
											<div className='flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-1'>
												<Button
													variant='ghost'
													size='icon'
													className='h-7 w-7'
													onClick={e => {
														e.stopPropagation()
														handleStartEdit(session.id, session.title)
													}}
													title={t('rename')}
												>
													<IconPencil className='w-3.5 h-3.5' />
												</Button>
												<Button
													variant='ghost'
													size='icon'
													className='h-7 w-7 text-destructive hover:text-destructive'
													onClick={e => {
														e.stopPropagation()
														handleDeleteClick(session.id, session.title)
													}}
													title={t('delete')}
												>
													<IconTrash className='w-3.5 h-3.5' />
												</Button>
											</div>
										</>
									)}
								</div>
							))
						)}
					</div>
				</div>
			</div>

			{/* Main Chat Area */}
			<div className='flex-1 flex flex-col min-w-0'>
				{/* Header */}
				<div className='flex items-center justify-between px-6 py-4 border-b h-[65pxl]'>
					<div className='flex items-center space-x-3'>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => setShowHistory(!showHistory)}
							className='h-9 w-9'
							title={t('history')}
						>
							<IconMessages className='w-6 h-6' />
						</Button>
						<div className='p-2 bg-orange-500 rounded-lg'>
							<IconSparkles className='w-5 h-5 text-white' />
						</div>
						<div>
							<h2 className='text-lg font-semibold'>{t('title')}</h2>
							<p className='text-xs text-muted-foreground'>{t('subtitle')}</p>
						</div>
					</div>
					<Button
						variant='ghost'
						size='sm'
						onClick={handleNewChat}
						className='flex items-center space-x-2'
					>
						<IconPlus className='w-4 h-4' />
						<span>{t('newChat')}</span>
					</Button>
				</div>

				{/* Messages Area */}
				<div className='flex-1 overflow-y-auto px-6 py-4'>
					{messages.length === 0 ? (
						// Empty state
						<div className='flex flex-col items-center justify-center h-full text-center'>
							<div className='p-4 bg-orange-100 dark:bg-orange-950 rounded-full mb-4'>
								<IconDatabase className='w-8 h-8 text-orange-600 dark:text-orange-400' />
							</div>
							<h3 className='text-xl font-semibold mb-2'>{t('emptyTitle')}</h3>
							<p className='text-muted-foreground mb-6 max-w-md'>
								{t('emptyDescription')}
							</p>

							{/* Suggestions */}
							<div className='flex flex-wrap justify-center gap-2 max-w-2xl'>
								{suggestions.map(suggestion => (
									<Button
										key={suggestion}
										variant='secondary'
										size='sm'
										onClick={() => {
											setInputValue(suggestion)
											inputRef.current?.focus()
										}}
										className='rounded-full cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors'
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
								// Find previous user message for error retry and context
								let previousUserMessageId: string | undefined
								let userQuestion: string | undefined
								for (let i = index - 1; i >= 0; i--) {
									if (messages[i].role === 'user') {
										if (message.metadata?.error) {
											previousUserMessageId = messages[i].id
										}
										userQuestion = messages[i].content
										break
									}
								}
								return (
									<ChatMessageDisplay
										key={message.id}
										message={message}
										onResend={resendMessage}
										onEdit={editAndResendMessage}
										isLoading={isLoading}
										previousUserMessageId={previousUserMessageId}
										userQuestion={userQuestion}
									/>
								)
							})}
							{isLoading && <LoadingMessage />}
							<div ref={messagesEndRef} />
						</>
					)}
				</div>

				{/* Input Area */}
				<div className='px-6 py-4 border-t'>
					<form onSubmit={handleSubmit} className='flex items-end space-x-3'>
						<div className='flex-1 relative'>
							<Textarea
								ref={inputRef}
								value={inputValue}
								onChange={handleInputChange}
								onKeyDown={handleKeyDown}
								placeholder={t('placeholder')}
								disabled={isLoading}
								rows={1}
								className='resize-none min-h-[48px] max-h-[200px]'
							/>
						</div>
						<Button
							type='submit'
							disabled={!inputValue.trim() || isLoading}
							size='icon'
							className='h-12 w-12 bg-orange-500 hover:bg-orange-600 text-white'
						>
							<IconSend className='w-5 h-5' />
						</Button>
					</form>
					<p className='text-xs text-muted-foreground mt-2 text-center'>
						{t('hint')}
					</p>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className='sm:max-w-[400px]' showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>{t('deleteDialog.title')}</DialogTitle>
						<DialogDescription>
							{t('deleteDialog.description', {
								title: sessionToDelete?.title || t('newChat'),
							})}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className='gap-3'>
						<Button variant='outline' onClick={handleCancelDelete}>
							{t('deleteDialog.cancel')}
						</Button>
						<Button variant='destructive' onClick={handleConfirmDelete}>
							{t('deleteDialog.confirm')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

// === Sidebar Component (for session history) ===

interface ChatSidebarProps {
	sessions: Array<{
		id: string
		title: string | null
		updated_at: string
	}>
	currentSessionId: string | null
	onSelectSession: (id: string) => void
	onNewChat: () => void
}

export function ChatSidebar({
	sessions,
	currentSessionId,
	onSelectSession,
	onNewChat,
}: ChatSidebarProps) {
	const t = useTranslations('chat')

	return (
		<div className='w-64 bg-card border-r flex flex-col'>
			{/* New Chat Button */}
			<div className='p-4'>
				<Button onClick={onNewChat} className='w-full'>
					<IconPlus className='w-4 h-4 mr-2' />
					{t('newChat')}
				</Button>
			</div>

			{/* Sessions List */}
			<div className='flex-1 overflow-y-auto px-2'>
				<p className='px-2 py-2 text-xs font-medium text-muted-foreground uppercase'>
					{t('history')}
				</p>
				{sessions.map(session => (
					<Button
						key={session.id}
						variant={currentSessionId === session.id ? 'secondary' : 'ghost'}
						onClick={() => onSelectSession(session.id)}
						className='w-full justify-start mb-1'
					>
						<IconMessage className='w-4 h-4 mr-2 shrink-0' />
						<span className='truncate text-sm'>
							{session.title || t('newChat')}
						</span>
					</Button>
				))}
			</div>
		</div>
	)
}

// === Full Chat Page Layout ===

interface ChatPageProps {
	webhookUrl: string
}

export function ChatPage({ webhookUrl }: ChatPageProps) {
	return (
		<div className='flex h-full'>
			{/* Main Chat Area */}
			<div className='flex-1'>
				<AIChat webhookUrl={webhookUrl} />
			</div>
		</div>
	)
}

export default AIChat
