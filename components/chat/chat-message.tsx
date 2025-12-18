'use client'

/**
 * AI Chat System - Main Message Component
 *
 * Sub-components extracted to separate files:
 * - chart-display.tsx    - Chart visualization with data source
 * - table-display.tsx    - Data table display
 * - code-display.tsx     - SQL/code display with copy
 * - parsed-table-display.tsx - Plain text table parsing
 * - loading-message.tsx  - Loading indicator
 * - utils/parse-text-table.ts - Table parsing utility
 */

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChatMessage, ChatMessageMetadata, formatDateTime } from '@/types/chat'
import {
	IconCheck,
	IconChevronDown,
	IconChevronUp,
	IconCopy,
	IconPencil,
	IconRefresh,
	IconX,
} from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { ChartDisplay } from './chart-display'
import { CodeDisplay } from './code-display'
import { ParsedTableDisplay } from './parsed-table-display'
import { ReportCard } from './report-card'
import { DeepDiveHint } from './report-discuss-button'
import { TableDisplay } from './table-display'
import { parseTextTable } from './utils/parse-text-table'

// Re-export sub-components for convenience
export { ChartDisplay } from './chart-display'
export { CodeDisplay } from './code-display'
export { LoadingMessage } from './loading-message'
export { ParsedTableDisplay } from './parsed-table-display'
export { TableDisplay } from './table-display'

// Constants
const MAX_MESSAGE_LENGTH = 300

// Prose styles for markdown content
const PROSE_STYLES =
	'prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-inherit [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_table]:rounded-lg [&_table]:overflow-hidden [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-muted [&_th]:border [&_th]:border-border [&_td]:px-4 [&_td]:py-2 [&_td]:border [&_td]:border-border [&_tr:hover]:bg-muted/50'

interface ChatMessageDisplayProps {
	message: ChatMessage
	onResend?: (messageId: string) => void
	onEdit?: (messageId: string, newContent: string) => void
	isLoading?: boolean
	previousUserMessageId?: string
	userQuestion?: string
}

export function ChatMessageDisplay({
	message,
	onResend,
	onEdit,
	isLoading,
	previousUserMessageId,
	userQuestion,
}: ChatMessageDisplayProps) {
	const t = useTranslations('chat.message')
	const locale = useLocale()
	const isUser = message.role === 'user'
	const metadata = message.metadata || {}

	const [isExpanded, setIsExpanded] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [editContent, setEditContent] = useState(message.content)
	const [copied, setCopied] = useState(false)

	const isLongMessage = message.content.length > MAX_MESSAGE_LENGTH
	const displayContent =
		isLongMessage && !isExpanded
			? message.content.slice(0, MAX_MESSAGE_LENGTH) + '...'
			: message.content
	const hasError = !!metadata.error
	const hasVisualization =
		message.content_type === 'chart' || message.content_type === 'table'

	const handleCopy = async () => {
		await navigator.clipboard.writeText(message.content)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleSaveEdit = () => {
		if (editContent.trim() && onEdit) {
			onEdit(message.id, editContent.trim())
			setIsEditing(false)
		}
	}

	// Render user message content
	const renderUserContent = () => {
		if (isEditing) {
			return (
				<div className='space-y-2'>
					<Textarea
						value={editContent}
						onChange={e => setEditContent(e.target.value)}
						className='min-h-[80px] bg-orange-200 border-orange-300 text-orange-950 placeholder:text-orange-400'
						autoFocus
					/>
					<div className='flex justify-end gap-2'>
						<Button
							size='sm'
							variant='ghost'
							onClick={() => {
								setEditContent(message.content)
								setIsEditing(false)
							}}
							className='h-7 text-orange-700 hover:text-orange-950 hover:bg-orange-200'
						>
							<IconX className='w-4 h-4 mr-1' />
							{t('cancel')}
						</Button>
						<Button
							size='sm'
							onClick={handleSaveEdit}
							disabled={!editContent.trim()}
							className='h-7 bg-orange-600 text-white hover:bg-orange-700'
						>
							<IconCheck className='w-4 h-4 mr-1' />
							{t('send')}
						</Button>
					</div>
				</div>
			)
		}

		return (
			<div>
				<div className='text-orange-950 dark:text-orange-100 whitespace-pre-wrap break-words'>
					{displayContent}
				</div>
				{isLongMessage && (
					<button
						onClick={() => setIsExpanded(!isExpanded)}
						className='mt-2 text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1'
					>
						{isExpanded ? (
							<>
								<IconChevronUp className='w-3 h-3' />
								{t('showLess')}
							</>
						) : (
							<>
								<IconChevronDown className='w-3 h-3' />
								{t('showMore')}
							</>
						)}
					</button>
				)}
			</div>
		)
	}

	// Render assistant message content
	const renderAssistantContent = () => {
		// Report link
		if (
			message.content_type === 'report_link' &&
			metadata.report_id &&
			metadata.report_url &&
			metadata.preview
		) {
			return (
				<>
					<div className={PROSE_STYLES}>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{message.content}
						</ReactMarkdown>
					</div>
					<ReportCard
						reportId={metadata.report_id}
						reportUrl={metadata.report_url}
						preview={metadata.preview}
						initialQuestion={userQuestion}
						initialAnswer={message.content}
					/>
				</>
			)
		}

		// Chart content
		const visualizationType =
			typeof metadata.visualization === 'string'
				? metadata.visualization
				: metadata.visualization?.type

		if (
			message.content_type === 'chart' &&
			metadata.data &&
			visualizationType
		) {
			const chartTypeMap: Record<string, string> = {
				bar: 'bar_chart',
				line: 'line_chart',
				pie: 'pie_chart',
				bar_chart: 'bar_chart',
				line_chart: 'line_chart',
				pie_chart: 'pie_chart',
			}
			const chartType = chartTypeMap[visualizationType] || 'bar_chart'
			const chartTitle =
				typeof metadata.visualization === 'object'
					? metadata.visualization.title
					: undefined

			return (
				<>
					<div className={PROSE_STYLES + ' mb-4'}>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{message.content}
						</ReactMarkdown>
					</div>
					<ChartDisplay
						data={metadata.data}
						chartType={chartType}
						config={{
							title: chartTitle,
							xKey:
								metadata.columns?.[0] || Object.keys(metadata.data[0] || {})[0],
							yKey:
								metadata.columns?.[1] || Object.keys(metadata.data[0] || {})[1],
						}}
					/>
					{metadata.sql_executed && (
						<CodeDisplay code={metadata.sql_executed} language='sql' />
					)}
				</>
			)
		}

		// Table content
		if (message.content_type === 'table' && metadata.data) {
			const tableTitle =
				typeof metadata.visualization === 'object'
					? metadata.visualization?.title
					: undefined
			return (
				<>
					<div className={PROSE_STYLES + ' mb-4'}>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{message.content}
						</ReactMarkdown>
					</div>
					<TableDisplay data={metadata.data} title={tableTitle} />
					{metadata.sql_executed && (
						<CodeDisplay code={metadata.sql_executed} language='sql' />
					)}
				</>
			)
		}

		// Text with possible plain text table
		const { before, tableData, after } = parseTextTable(message.content)

		if (tableData) {
			return (
				<>
					{before && (
						<div className={PROSE_STYLES}>
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{before}</ReactMarkdown>
						</div>
					)}
					<ParsedTableDisplay data={tableData} />
					{after && (
						<div className={PROSE_STYLES}>
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{after}</ReactMarkdown>
						</div>
					)}
					{metadata.sql_executed && (
						<details className='mt-3'>
							<summary className='text-xs text-muted-foreground cursor-pointer hover:text-foreground'>
								{t('showSql')}
							</summary>
							<CodeDisplay code={metadata.sql_executed} language='sql' />
						</details>
					)}
				</>
			)
		}

		// Regular text
		return (
			<>
				<div className={PROSE_STYLES}>
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{message.content || ''}
					</ReactMarkdown>
				</div>
				{metadata.sql_executed && (
					<details className='mt-3'>
						<summary className='text-xs text-muted-foreground cursor-pointer hover:text-foreground'>
							{t('showSql')}
						</summary>
						<CodeDisplay code={metadata.sql_executed} language='sql' />
					</details>
				)}
			</>
		)
	}

	return (
		<div
			className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}
		>
			<div
				className={`rounded-2xl px-4 py-3 ${
					hasVisualization && !isUser ? 'w-full max-w-4xl' : 'max-w-[85%]'
				} ${
					isUser
						? 'bg-orange-100 dark:bg-orange-900/30 rounded-br-md border border-orange-200 dark:border-orange-800'
						: hasError
							? 'bg-red-50 dark:bg-red-950 text-foreground rounded-bl-md border border-red-200 dark:border-red-800'
							: 'bg-muted text-foreground rounded-bl-md'
				}`}
			>
				{isUser ? renderUserContent() : renderAssistantContent()}

				{/* Deep dive hint */}
				{!isUser &&
					metadata.suggest_deep_dive &&
					metadata.report_id &&
					metadata.report_url && (
						<DeepDiveHint
							reportId={String(metadata.report_id)}
							reportUrl={metadata.report_url}
						/>
					)}

				{/* Footer */}
				<MessageFooter
					message={message}
					metadata={metadata}
					isUser={isUser}
					isEditing={isEditing}
					isLoading={isLoading}
					hasError={hasError}
					copied={copied}
					locale={locale}
					previousUserMessageId={previousUserMessageId}
					onCopy={handleCopy}
					onEdit={() => setIsEditing(true)}
					onResend={onResend}
				/>
			</div>
		</div>
	)
}

// Footer component to keep main component clean
interface MessageFooterProps {
	message: ChatMessage
	metadata: ChatMessageMetadata
	isUser: boolean
	isEditing: boolean
	isLoading?: boolean
	hasError: boolean
	copied: boolean
	locale: string
	previousUserMessageId?: string
	onCopy: () => void
	onEdit: () => void
	onResend?: (messageId: string) => void
}

function MessageFooter({
	message,
	metadata,
	isUser,
	isEditing,
	isLoading,
	hasError,
	copied,
	locale,
	previousUserMessageId,
	onCopy,
	onEdit,
	onResend,
}: MessageFooterProps) {
	const t = useTranslations('chat.message')

	return (
		<div
			className={`flex items-center justify-between mt-2 pt-2 ${
				isUser
					? 'border-t border-orange-200/50 dark:border-orange-700/50'
					: hasError
						? 'border-t border-red-200/50 dark:border-red-800/50'
						: 'border-t border-border/50'
			}`}
		>
			<span
				className={`text-xs ${
					isUser
						? 'text-orange-600 dark:text-orange-400'
						: hasError
							? 'text-red-500 dark:text-red-400'
							: 'text-muted-foreground'
				}`}
			>
				{formatDateTime(message.created_at, locale)}
			</span>

			<div className='flex items-center gap-2'>
				{metadata.execution_time_ms && (
					<span className='text-xs text-muted-foreground'>
						{metadata.execution_time_ms as number}ms •{' '}
						{(metadata.rows_count as number) || 0} rows
					</span>
				)}

				{/* User message actions */}
				{isUser && !isEditing && !isLoading && (
					<div className='flex items-center gap-1'>
						<ActionButton
							onClick={onCopy}
							title={t('copy')}
							isUser={isUser}
							icon={
								copied ? (
									<IconCheck className='w-3.5 h-3.5' />
								) : (
									<IconCopy className='w-3.5 h-3.5' />
								)
							}
						/>
						<ActionButton
							onClick={onEdit}
							title={t('edit')}
							isUser={isUser}
							icon={<IconPencil className='w-3.5 h-3.5' />}
						/>
						<ActionButton
							onClick={() => onResend?.(message.id)}
							title={t('resend')}
							isUser={isUser}
							icon={<IconRefresh className='w-3.5 h-3.5' />}
						/>
					</div>
				)}

				{/* Assistant copy button */}
				{!isUser && !hasError && (
					<Button
						size='sm'
						variant='ghost'
						onClick={onCopy}
						className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-accent'
						title={t('copy')}
					>
						{copied ? (
							<IconCheck className='w-3.5 h-3.5' />
						) : (
							<IconCopy className='w-3.5 h-3.5' />
						)}
					</Button>
				)}

				{/* Error retry button */}
				{hasError && !isLoading && previousUserMessageId && (
					<Button
						size='sm'
						variant='ghost'
						onClick={() => onResend?.(previousUserMessageId)}
						className='h-6 px-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900'
					>
						<IconRefresh className='w-3.5 h-3.5 mr-1' />
						{t('retry')}
					</Button>
				)}
			</div>
		</div>
	)
}

// Small action button for user messages
interface ActionButtonProps {
	onClick: () => void
	title: string
	isUser: boolean
	icon: React.ReactNode
}

function ActionButton({ onClick, title, icon }: ActionButtonProps) {
	return (
		<button
			onClick={onClick}
			className='h-6 w-6 p-0 flex items-center justify-center text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 rounded transition-colors cursor-pointer'
			title={title}
		>
			{icon}
		</button>
	)
}
