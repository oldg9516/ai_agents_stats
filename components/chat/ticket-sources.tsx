'use client'

/**
 * Ticket Sources Accordion - Shows source tickets used for AI response
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	IconChevronDown,
	IconChevronUp,
	IconTicket,
	IconExternalLink,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { TicketSource } from '@/types/chat'

interface TicketSourcesAccordionProps {
	sources: TicketSource[]
	className?: string
}

export function TicketSourcesAccordion({
	sources,
	className = '',
}: TicketSourcesAccordionProps) {
	const t = useTranslations('reportChat.sources')
	const [isExpanded, setIsExpanded] = useState(false)

	if (!sources || sources.length === 0) return null

	// Sort by relevance score
	const sortedSources = [...sources].sort((a, b) => b.relevance_score - a.relevance_score)

	return (
		<div className={`mt-2 mb-4 ${className}`}>
			<Button
				variant='ghost'
				size='sm'
				onClick={() => setIsExpanded(!isExpanded)}
				className='w-full justify-between h-8 px-3 text-xs text-muted-foreground hover:text-foreground'
			>
				<span className='flex items-center gap-1.5'>
					<IconTicket className='w-3.5 h-3.5' />
					{t('title')} ({sources.length})
				</span>
				{isExpanded ? (
					<IconChevronUp className='w-3.5 h-3.5' />
				) : (
					<IconChevronDown className='w-3.5 h-3.5' />
				)}
			</Button>

			{isExpanded && (
				<div className='mt-2 space-y-2 pl-2'>
					{sortedSources.map((source, idx) => (
						<TicketSourceCard key={`${source.thread_id}-${idx}`} source={source} />
					))}
				</div>
			)}
		</div>
	)
}

interface TicketSourceCardProps {
	source: TicketSource
}

function TicketSourceCard({ source }: TicketSourceCardProps) {
	const t = useTranslations('reportChat.sources')

	// Format relevance as percentage
	const relevancePercent = Math.round(source.relevance_score * 100)

	// Relevance color
	const relevanceColor =
		relevancePercent >= 80
			? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
			: relevancePercent >= 60
				? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
				: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'

	return (
		<div className='border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors'>
			{/* Header */}
			<div className='flex items-center justify-between mb-2'>
				<div className='flex items-center gap-2'>
					<span className='text-xs font-mono text-muted-foreground'>
						#{source.ticket_id}
					</span>
					<Badge variant='outline' className='text-xs px-1.5 py-0'>
						{source.category}
					</Badge>
				</div>
				<Badge className={`text-xs px-1.5 py-0 ${relevanceColor}`}>
					{relevancePercent}%
				</Badge>
			</div>

			{/* Snippet */}
			<p className='text-xs text-muted-foreground line-clamp-2'>
				{source.snippet}
			</p>

			{/* Date */}
			{source.date && (
				<p className='text-xs text-muted-foreground mt-1.5 opacity-70'>
					{new Date(source.date).toLocaleDateString()}
				</p>
			)}
		</div>
	)
}

/**
 * Inline source references for text content
 * Use this to show [#123] style references that expand on click
 */
interface InlineSourceRefProps {
	ticketId: string
	onClick?: () => void
}

export function InlineSourceRef({ ticketId, onClick }: InlineSourceRefProps) {
	return (
		<button
			onClick={onClick}
			className='inline-flex items-center text-xs text-orange-600 dark:text-orange-400 hover:underline cursor-pointer'
		>
			[#{ticketId}]
		</button>
	)
}
