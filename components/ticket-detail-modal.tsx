'use client'

/**
 * Ticket Detail Modal Component
 *
 * Shows ticket details in a modal dialog
 * Used by Parallel Routes to display ticket without leaving the table
 */

import { TicketChangesAccordion } from '@/components/ticket-changes-accordion'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
	calculateQualityScore,
	getClassificationColor,
	getScoreGroup,
} from '@/constants/classification-types'
import { REVIEWER_AGENTS } from '@/constants/qualified-agents'
import { updateTicketReview } from '@/lib/actions/ticket-update-actions'
import { triggerTicketsRefresh } from '@/lib/hooks/use-paginated-tickets'
import type { TicketReviewRecord } from '@/lib/supabase/types'
import { IconCheck, IconExternalLink, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface TicketDetailModalProps {
	ticket: TicketReviewRecord
	prevTicketId?: number | null
	nextTicketId?: number | null
}

export function TicketDetailModal({
	ticket,
	prevTicketId,
	nextTicketId,
}: TicketDetailModalProps) {
	const router = useRouter()
	const t = useTranslations('ticketsReview')

	// Local state for optimistic UI updates
	const [reviewStatus, setReviewStatus] = useState<'processed' | 'unprocessed'>(
		ticket.review_status || 'unprocessed'
	)
	const [aiApproved, setAiApproved] = useState(ticket.ai_approved || false)
	const [manualComment, setManualComment] = useState(
		ticket.manual_comment || ''
	)
	const [selectedReviewer, setSelectedReviewer] = useState<string | null>(
		ticket.reviewer_name || null
	)
	const [isSaving, setIsSaving] = useState(false)

	// Close modal by navigating back
	const handleClose = () => {
		router.back()
	}

	// Navigate to previous ticket
	const handlePrevTicket = () => {
		if (prevTicketId) {
			router.replace(`/tickets-review/ticket/${prevTicketId}`)
		}
	}

	// Navigate to next ticket
	const handleNextTicket = () => {
		if (nextTicketId) {
			router.replace(`/tickets-review/ticket/${nextTicketId}`)
		}
	}

	// Handle AI approval checkbox change (local state only, no API call)
	const handleAiApprovalChange = (checked: boolean) => {
		setAiApproved(checked)
	}

	// Mark as processed - saves comment, AI approval, reviewer name, and status
	const handleMarkAsProcessed = async () => {
		setIsSaving(true)
		setReviewStatus('processed') // Optimistic update

		const result = await updateTicketReview(ticket.id, {
			reviewStatus: 'processed',
			aiApproved: aiApproved,
			manualComment: manualComment,
			reviewerName: selectedReviewer || undefined,
		})

		if (result.success) {
			toast.success(t('modal.saved'))
			// Trigger table refresh via custom event
			triggerTicketsRefresh()
		} else {
			// Revert on error
			setReviewStatus(ticket.review_status || 'unprocessed')
			toast.error(result.error || t('modal.saveFailed'))
		}

		setIsSaving(false)
	}

	// Mark as unprocessed
	const handleMarkAsUnprocessed = async () => {
		setIsSaving(true)
		setReviewStatus('unprocessed') // Optimistic update

		const result = await updateTicketReview(ticket.id, {
			reviewStatus: 'unprocessed',
		})

		if (result.success) {
			toast.success(t('modal.saved'))
			// Trigger table refresh via custom event
			triggerTicketsRefresh()
		} else {
			// Revert on error
			setReviewStatus(ticket.review_status || 'unprocessed')
			toast.error(result.error || t('modal.saveFailed'))
		}

		setIsSaving(false)
	}

	// Get quality score for display
	const qualityScore = calculateQualityScore(ticket.change_classification)
	const scoreGroup = getScoreGroup(qualityScore)

	return (
		<Dialog open onOpenChange={handleClose}>
			<DialogContent className='max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-6xl h-[95vh] sm:h-[90vh] p-0 gap-0 flex flex-col overflow-hidden'>
				<DialogHeader className='px-4 py-4 sm:px-6 sm:py-6 border-b shrink-0'>
					<div className='flex items-start justify-between gap-4'>
						<div className='flex-1 min-w-0'>
							<div className='flex items-center gap-3 flex-wrap'>
								<DialogTitle className='text-lg sm:text-xl'>
									{t('modal.title')}
								</DialogTitle>
								{/* Classification Badge */}
								{ticket.change_classification && (
									<span
										className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${getClassificationColor(
											ticket.change_classification
										)}`}
									>
										{t(
											`classifications.${ticket.change_classification}` as unknown as 'classifications.critical_error'
										)}
									</span>
								)}
							</div>
							<DialogDescription className='font-mono text-xs sm:text-sm break-all flex items-center gap-2 flex-wrap'>
								<span>ID: {ticket.id}</span>
								{ticket.request_subtype && (
									<span className='inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'>
										{ticket.request_subtype}
									</span>
								)}
							</DialogDescription>
						</div>
						<Button
							variant='outline'
							size='sm'
							asChild
							className='shrink-0 mr-6 self-end'
						>
							<Link
								href={`/tickets-review/ticket/${ticket.id}`}
								target='_blank'
								rel='noopener noreferrer'
							>
								<IconExternalLink className='h-4 w-4 mr-2' />
								<span className='hidden sm:inline'>
									{t('modal.openFullPage')}
								</span>
								<span className='sm:hidden'>{t('modal.open')}</span>
							</Link>
						</Button>
					</div>

					{/* Navigation Buttons */}
					<div className='flex items-center justify-center gap-3 mt-3'>
						<Button
							variant='outline'
							size='sm'
							onClick={handlePrevTicket}
							disabled={!prevTicketId}
							className='h-9 px-6 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300 disabled:opacity-40'
						>
							<IconChevronLeft className='h-4 w-4 mr-1' />
							{t('modal.prevTicket')}
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={handleNextTicket}
							disabled={!nextTicketId}
							className='h-9 px-6 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300 disabled:opacity-40'
						>
							{t('modal.nextTicket')}
							<IconChevronRight className='h-4 w-4 ml-1' />
						</Button>
					</div>
				</DialogHeader>

				<div className='flex-1 overflow-y-auto overflow-x-hidden'>
					<div className='p-4 sm:p-6 space-y-4 sm:space-y-6'>
						{/* Metadata - Accordion */}
						<div className='border rounded-lg bg-card overflow-hidden'>
							<Accordion type='single' collapsible className='w-full'>
								<AccordionItem value='metadata' className='border-none'>
									<AccordionTrigger className='px-4 sm:px-6 py-4 hover:no-underline'>
										<div className='text-left'>
											<div className='text-sm sm:text-base font-semibold'>
												{t('modal.ticketInformation')}
											</div>
										</div>
									</AccordionTrigger>
									<AccordionContent className='px-4 sm:px-6 pb-4'>
										<div className='space-y-3 sm:space-y-4 pt-2'>
											<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
												<div>
													<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
														{t('modal.ticketId')}
													</p>
													<p className='text-xs sm:text-sm font-mono break-all'>
														{ticket.ticket_id || '—'}
													</p>
												</div>
												<div>
													<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
														{t('modal.threadId')}
													</p>
													<p className='text-xs sm:text-sm font-mono break-all'>
														{ticket.thread_id || '—'}
													</p>
												</div>
											</div>

											<Separator />

											<div>
												<p className='text-xs sm:text-sm font-medium text-muted-foreground mb-2'>
													{t('table.classification')}
												</p>
												{ticket.change_classification ? (
													<div className='flex items-center gap-2'>
														<div
															className={`inline-block px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${getClassificationColor(
																ticket.change_classification
															)}`}
														>
															{t(
																`classifications.${ticket.change_classification}` as unknown as 'classifications.critical_error'
															)}
														</div>
														{qualityScore !== null && (
															<span className='text-xs text-muted-foreground'>
																(Score: {qualityScore})
															</span>
														)}
													</div>
												) : (
													<p className='text-xs sm:text-sm'>—</p>
												)}
											</div>

											<Separator />

											<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
												<div>
													<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
														{t('modal.category')}
													</p>
													<p className='text-xs sm:text-sm'>
														{ticket.request_subtype || '—'}
													</p>
												</div>
												<div>
													<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
														{t('modal.version')}
													</p>
													<p className='text-xs sm:text-sm'>
														{ticket.prompt_version || '—'}
													</p>
												</div>
											</div>

											<Separator />

											<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
												<div>
													<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
														{t('table.agent')}
													</p>
													<p className='text-xs sm:text-sm break-all'>
														{ticket.email || '—'}
													</p>
												</div>
												<div>
													<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
														{t('table.customerEmail')}
													</p>
													<p className='text-xs sm:text-sm break-all'>
														{ticket.user || '—'}
													</p>
												</div>
											</div>

											<Separator />

											<div>
												<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
													{t('modal.createdAt')}
												</p>
												<p className='text-xs sm:text-sm'>
													{ticket.created_at
														? format(
																new Date(ticket.created_at),
																'MMM dd, yyyy HH:mm'
														  )
														: '—'}
												</p>
											</div>
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</div>

						{/* Customer Request */}
						{ticket.customer_request_text && (
							<Card>
								<CardHeader>
									<CardTitle className='text-base sm:text-lg'>
										{t('modal.customerRequest')}
									</CardTitle>
									<CardDescription className='text-xs sm:text-sm'>
										{t('modal.customerRequestDesc')}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='rounded-lg bg-muted p-3 sm:p-4 max-h-[40vh] overflow-y-auto'>
										<p className='text-xs sm:text-sm leading-relaxed whitespace-pre-wrap'>
											{ticket.customer_request_text}
										</p>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Response Comparison - 2 columns on desktop */}
						<div className='grid gap-4 sm:gap-6 lg:grid-cols-2'>
							{/* Agent Response */}
							{ticket.human_reply && (
								<Card>
									<CardHeader>
										<CardTitle className='text-base sm:text-lg'>
											{t('modal.agentResponse')}
										</CardTitle>
										<CardDescription className='text-xs sm:text-sm'>
											{ticket.email || t('modal.unknownAgent')}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className='rounded-lg bg-muted p-3 sm:p-4 max-h-[50vh] overflow-y-auto'>
											<div className='text-xs sm:text-sm leading-loose [&>br]:block [&>br]:mt-2'>
												{ticket.human_reply
													?.split(/\n+/)
													.map((paragraph, i) => (
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
										<CardTitle className='text-base sm:text-lg'>
											{t('modal.aiResponse')}
										</CardTitle>
										<CardDescription className='text-xs sm:text-sm'>
											{t('modal.aiResponseDesc')}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className='rounded-lg bg-muted p-3 sm:p-4 max-h-[50vh] overflow-y-auto'>
											<div className='text-xs sm:text-sm leading-loose [&>br]:block [&>br]:mt-2'>
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

						{/* AI Comment */}
						{ticket.comment && (
							<Card>
								<CardHeader>
									<CardTitle className='text-base sm:text-lg'>
										{t('modal.aiComment')}
									</CardTitle>
									<CardDescription className='text-xs sm:text-sm'>
										{t('modal.aiCommentDesc')}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='rounded-lg bg-muted p-3 sm:p-4 max-h-[30vh] overflow-y-auto'>
										<p className='text-xs sm:text-sm leading-relaxed whitespace-pre-wrap'>
											{ticket.comment}
										</p>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Changes/Suggestions Accordion */}
						<TicketChangesAccordion changes={ticket.changes} />

						{/* Review Actions - Comment + AI Approval + Status */}
						<Card>
							<CardHeader>
								<CardTitle className='text-base sm:text-lg'>
									{t('modal.reviewActions')}
								</CardTitle>
								<CardDescription className='text-xs sm:text-sm'>
									{t('modal.reviewActionsDesc')}
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								{/* Reviewer Selection */}
								<div className='space-y-2'>
									<Label className='text-sm font-medium'>
										{t('modal.reviewer')}
									</Label>
									<div className='flex flex-wrap gap-3'>
										{REVIEWER_AGENTS.map(agent => (
											<Badge
												key={agent.id}
												variant='outline'
												className={`cursor-pointer transition-all text-sm px-4 py-2 ${
													selectedReviewer === agent.name
														? `${agent.color} border-transparent ring-2 ring-white/50 ring-offset-2 ring-offset-background`
														: 'opacity-60 hover:opacity-100'
												}`}
												onClick={() =>
													setSelectedReviewer(
														selectedReviewer === agent.name ? null : agent.name
													)
												}
											>
												{agent.name}
											</Badge>
										))}
									</div>
								</div>

								<Separator />

								{/* Manual Comment */}
								<div className='space-y-2'>
									<Label className='text-sm font-medium'>
										{t('modal.comment')}
									</Label>
									<Textarea
										placeholder={t('modal.commentPlaceholder')}
										value={manualComment}
										onChange={e => setManualComment(e.target.value)}
										className='min-h-[100px] resize-none'
										disabled={isSaving}
									/>
								</div>

								<Separator />

								{/* AI Approval Checkbox */}
								<div className='flex items-center space-x-3 p-3 rounded-lg border bg-muted/30'>
									<Checkbox
										id='ai-approved'
										checked={aiApproved}
										onCheckedChange={handleAiApprovalChange}
										disabled={isSaving}
									/>
									<Label
										htmlFor='ai-approved'
										className='text-sm font-medium cursor-pointer flex items-center gap-2'
									>
										<IconCheck className='h-4 w-4' />
										{t('modal.approveAiAnswer')}
										{aiApproved && (
											<span className='text-xs text-green-600 dark:text-green-400'>
												({t('modal.aiApproved')})
											</span>
										)}
									</Label>
								</div>

								<Separator />

								{/* Status Buttons */}
								<div className='space-y-2'>
									<Label className='text-sm font-medium'>
										{t('modal.reviewStatus')}
									</Label>
									<div className='flex gap-2'>
										<Button
											variant={
												reviewStatus === 'processed' ? 'default' : 'outline'
											}
											size='sm'
											className='flex-1'
											onClick={handleMarkAsProcessed}
											disabled={isSaving}
										>
											{isSaving && reviewStatus === 'processed' ? (
												<span>{t('modal.saving')}</span>
											) : (
												t('modal.markAsProcessed')
											)}
										</Button>
										<Button
											variant={
												reviewStatus === 'unprocessed' ? 'default' : 'outline'
											}
											size='sm'
											className='flex-1'
											onClick={handleMarkAsUnprocessed}
											disabled={isSaving || reviewStatus === 'unprocessed'}
										>
											{isSaving && reviewStatus === 'unprocessed' ? (
												<span>{t('modal.saving')}</span>
											) : (
												t('modal.markAsUnprocessed')
											)}
										</Button>
									</div>
									<p className='text-xs text-muted-foreground'>
										{t('modal.processedHint')}
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
