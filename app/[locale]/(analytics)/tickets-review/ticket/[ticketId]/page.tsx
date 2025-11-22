import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { fetchTicketDetail } from '@/lib/supabase/queries-tickets-review'
import { supabaseServer } from '@/lib/supabase/server'
import { IconArrowLeft } from '@tabler/icons-react'
import { format } from 'date-fns'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TicketCommentEditor } from '@/components/ticket-comment-editor'
import { TicketReviewActions } from '@/components/ticket-review-actions'
import { getTranslations } from 'next-intl/server'

interface TicketDetailPageProps {
	params: Promise<{
		ticketId: string
	}>
}

export async function generateMetadata({
	params,
}: TicketDetailPageProps): Promise<Metadata> {
	const { ticketId } = await params
	return {
		title: `Ticket ${ticketId} | Tickets Review`,
		description: `Details for ticket ${ticketId}`,
	}
}

/**
 * Ticket Detail Page
 *
 * Shows full details of a single ticket including:
 * - Metadata (IDs, dates, classification, agent)
 * - Customer request
 * - Agent response
 * - AI response
 * - AI comment (if exists)
 * - Manual comment editor
 * - Review actions (status, AI approval)
 */
export default async function TicketDetailPage({
	params,
}: TicketDetailPageProps) {
	const { ticketId } = await params
	const t = await getTranslations('ticketsReview.modal')

	// Fetch ticket details
	let ticket
	try {
		ticket = await fetchTicketDetail(supabaseServer, parseInt(ticketId))
	} catch (error) {
		console.error('Error fetching ticket:', error)
		notFound()
	}

	if (!ticket) {
		notFound()
	}

	// Get classification label and color
	const getClassificationColor = (classification: string | null) => {
		switch (classification) {
			case 'critical_error':
				return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
			case 'meaningful_improvement':
				return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
			case 'stylistic_preference':
				return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
			case 'no_significant_change':
				return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
			case 'context_shift':
				return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
			default:
				return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
		}
	}

	return (
		<div className='min-h-screen p-4 sm:p-6 space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-4'>
					<Link href='/tickets-review'>
						<Button variant='ghost' size='sm'>
							<IconArrowLeft className='h-4 w-4 mr-2' />
							Back to Tickets
						</Button>
					</Link>
					<div>
						<h1 className='text-2xl font-bold'>Ticket Details</h1>
						<p className='text-sm text-muted-foreground'>ID: {ticket.id}</p>
					</div>
				</div>
			</div>

			<div className='grid gap-6 lg:grid-cols-2'>
				{/* Metadata Card */}
				<Card>
					<CardHeader>
						<CardTitle>Ticket Information</CardTitle>
						<CardDescription>Basic ticket metadata</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									Ticket ID
								</p>
								<p className='text-sm font-mono'>{ticket.ticket_id || '—'}</p>
							</div>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									Thread ID
								</p>
								<p className='text-sm font-mono'>{ticket.thread_id || '—'}</p>
							</div>
						</div>

						<Separator />

						<div>
							<p className='text-sm font-medium text-muted-foreground mb-2'>
								Classification
							</p>
							{ticket.change_classification ? (
								<div
									className={`inline-block px-3 py-1 rounded text-sm ${getClassificationColor(
										ticket.change_classification
									)}`}
								>
									{ticket.change_classification}
								</div>
							) : (
								<p className='text-sm'>—</p>
							)}
						</div>

						<Separator />

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									Category
								</p>
								<p className='text-sm'>{ticket.request_subtype || '—'}</p>
							</div>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									Version
								</p>
								<p className='text-sm'>{ticket.prompt_version || '—'}</p>
							</div>
						</div>

						<Separator />

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									Agent
								</p>
								<p className='text-sm truncate'>{ticket.email || '—'}</p>
							</div>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									Customer
								</p>
								<p className='text-sm truncate'>{ticket.user || '—'}</p>
							</div>
						</div>

						<Separator />

						<div>
							<p className='text-sm font-medium text-muted-foreground'>
								Created At
							</p>
							<p className='text-sm'>
								{ticket.created_at
									? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')
									: '—'}
							</p>
						</div>
					</CardContent>
				</Card>

				{/* AI Comment Card (if exists) */}
				{ticket.comment && (
					<Card>
						<CardHeader>
							<CardTitle>{t('aiComment')}</CardTitle>
							<CardDescription>{t('aiCommentDesc')}</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='rounded-lg bg-muted p-4 max-h-80 overflow-y-auto'>
								<p className='text-sm whitespace-pre-wrap leading-relaxed'>
									{ticket.comment}
								</p>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Customer Request */}
			{ticket.customer_request_text && (
				<Card>
					<CardHeader>
						<CardTitle>Customer Request</CardTitle>
						<CardDescription>Original customer message</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='rounded-lg bg-muted p-4 max-h-80 overflow-y-auto'>
							<p className='text-sm whitespace-pre-wrap leading-relaxed'>
								{ticket.customer_request_text}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Response Comparison */}
			<div className='grid gap-6 lg:grid-cols-2'>
				{/* Agent Response */}
				{ticket.human_reply && (
					<Card>
						<CardHeader>
							<CardTitle>Agent Response</CardTitle>
							<CardDescription>
								{ticket.email || 'Unknown agent'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='rounded-lg bg-muted p-4 max-h-96 overflow-y-auto'>
								<div
									className='prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed'
									dangerouslySetInnerHTML={{ __html: ticket.human_reply }}
								/>
							</div>
						</CardContent>
					</Card>
				)}

				{/* AI Response */}
				{ticket.ai_reply && (
					<Card>
						<CardHeader>
							<CardTitle>AI Response</CardTitle>
							<CardDescription>AI-generated response</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='rounded-lg bg-muted p-4 max-h-96 overflow-y-auto'>
								<div
									className='prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed'
									dangerouslySetInnerHTML={{ __html: ticket.ai_reply }}
								/>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Manual Comment Editor */}
			<TicketCommentEditor
				ticketId={ticket.id}
				initialComment={ticket.manual_comment}
			/>

			{/* Review Actions */}
			<TicketReviewActions
				ticketId={ticket.id}
				initialReviewStatus={ticket.review_status}
				initialAiApproved={ticket.ai_approved}
			/>
		</div>
	)
}
