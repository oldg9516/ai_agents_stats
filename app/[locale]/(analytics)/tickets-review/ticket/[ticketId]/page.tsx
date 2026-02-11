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
import { IconArrowLeft, IconCheck, IconExternalLink } from '@tabler/icons-react'
import { format } from 'date-fns'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TicketChangesAccordion } from '@/components/ticket-changes-accordion'
import { TicketReviewActions } from '@/components/ticket-review-actions'
import { getTranslations } from 'next-intl/server'
import {
	getClassificationColor,
	calculateQualityScore,
} from '@/constants/classification-types'
import { ZOHO_TICKET_URL } from '@/constants/zoho'
import { Badge } from '@/components/ui/badge'
import { isTicketReviewed } from '@/lib/utils/filter-utils'

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
	const tStatuses = await getTranslations('ticketsReview.statuses')

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

	// Calculate quality score for display
	const qualityScore = calculateQualityScore(ticket.change_classification)

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
						<div className='flex items-center gap-3'>
							<h1 className='text-2xl font-bold'>Ticket Details</h1>
							{isTicketReviewed(ticket) && (
								<Badge className='bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800'>
									<IconCheck className='h-3 w-3 mr-1' />
									{tStatuses('reviewed')}
								</Badge>
							)}
						</div>
						<p className='text-sm text-muted-foreground'>ID: {ticket.id}</p>
					</div>
				</div>
				{ticket.ticket_id && (
					<Button variant='outline' size='sm' asChild>
						<a
							href={`${ZOHO_TICKET_URL}${ticket.ticket_id}`}
							target='_blank'
							rel='noopener noreferrer'
						>
							<IconExternalLink className='h-4 w-4 mr-2' />
							Zoho
						</a>
					</Button>
				)}
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
								<div className='flex items-center gap-2'>
									<div
										className={`inline-block px-3 py-1 rounded text-sm ${getClassificationColor(
											ticket.change_classification
										)}`}
									>
										{ticket.change_classification}
									</div>
									{qualityScore !== null && (
										<span className='text-sm text-muted-foreground'>
											(Score: {qualityScore})
										</span>
									)}
								</div>
							) : (
								<p className='text-sm'>—</p>
							)}
						</div>

						<Separator />

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									{t('category')}
								</p>
								<p className='text-sm'>{ticket.request_subtype || '—'}</p>
							</div>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									{t('subSubcategory')}
								</p>
								<p className='text-sm'>{ticket.request_sub_subtype || '—'}</p>
							</div>
						</div>

						<Separator />

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									{t('version')}
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
								<div className='text-sm leading-loose [&>br]:block [&>br]:mt-2'>
									{ticket.human_reply?.split(/\n+/).map((paragraph, i) => (
										<span key={i}>
											{i > 0 && <br />}
											{paragraph}
										</span>
									))}
								</div>
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
								<div className='text-sm leading-loose [&>br]:block [&>br]:mt-2'>
									{ticket.ai_reply?.split(/\n+/).map((paragraph, i) => (
										<span key={i}>
											{i > 0 && <br />}
											{paragraph}
										</span>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Changes/Suggestions Accordion */}
			<TicketChangesAccordion changes={ticket.changes} />

			{/* Review Actions (includes comment, AI approval, and status) */}
			<TicketReviewActions
				ticketId={ticket.id}
				initialReviewStatus={ticket.review_status}
				initialAiApproved={ticket.ai_approved}
				initialComment={ticket.manual_comment}
				initialReviewerName={ticket.reviewer_name}
				initialClassification={ticket.change_classification}
				initialActionAnalysis={ticket.action_analysis}
				initialActionAnalysisVerification={ticket.action_analysis_verification}
			/>
		</div>
	)
}
