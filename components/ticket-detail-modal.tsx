'use client'

/**
 * Ticket Detail Modal Component
 *
 * Shows ticket details in a modal dialog
 * Used by Parallel Routes to display ticket without leaving the table
 */

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
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
import { updateTicketReview } from '@/lib/actions/ticket-update-actions'
import type { TicketReviewRecord } from '@/lib/supabase/types'
import { IconCheck, IconExternalLink } from '@tabler/icons-react'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface TicketDetailModalProps {
	ticket: TicketReviewRecord
}

export function TicketDetailModal({ ticket }: TicketDetailModalProps) {
	const router = useRouter()
	const t = useTranslations('ticketsReview')

	// Local state for optimistic UI updates
	const [reviewStatus, setReviewStatus] = useState<'processed' | 'unprocessed'>(
		ticket.review_status || 'unprocessed'
	)
	const [aiApproved, setAiApproved] = useState(ticket.ai_approved || false)
	const [isSaving, setIsSaving] = useState(false)

	// Close modal by navigating back
	const handleClose = () => {
		router.back()
	}

	// Update review status
	const handleStatusChange = async (newStatus: 'processed' | 'unprocessed') => {
		setIsSaving(true)
		setReviewStatus(newStatus) // Optimistic update

		const result = await updateTicketReview(ticket.id, {
			reviewStatus: newStatus,
		})

		if (result.success) {
			toast.success(t('modal.saved'))
		} else {
			// Revert on error
			setReviewStatus(ticket.review_status || 'unprocessed')
			toast.error(result.error || 'Failed to update status')
		}

		setIsSaving(false)
	}

	// Update AI approval
	const handleAiApprovalChange = async (checked: boolean) => {
		setIsSaving(true)
		setAiApproved(checked) // Optimistic update

		const result = await updateTicketReview(ticket.id, {
			aiApproved: checked,
		})

		if (result.success) {
			toast.success(t('modal.saved'))
		} else {
			// Revert on error
			setAiApproved(ticket.ai_approved || false)
			toast.error(result.error || 'Failed to update AI approval')
		}

		setIsSaving(false)
	}

	// Get classification color
	const getClassificationColor = (classification: string | null) => {
		switch (classification) {
			case 'critical_error':
				return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
			case 'meaningful_improvement':
				return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
			case 'stylistic_preference':
				return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
			case 'no_significant_change':
				return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
			case 'context_shift':
				return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
			default:
				return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
		}
	}

	return (
		<Dialog open onOpenChange={handleClose}>
			<DialogContent className='max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-6xl h-[95vh] sm:h-[90vh] p-0 gap-0 flex flex-col overflow-hidden'>
				<DialogHeader className='px-4 py-4 sm:px-6 sm:py-6 border-b shrink-0'>
					<div className='flex items-start justify-between gap-4'>
						<div className='flex-1 min-w-0'>
							<DialogTitle className='text-lg sm:text-xl'>
								{t('modal.title')}
							</DialogTitle>
							<DialogDescription className='font-mono text-xs sm:text-sm break-all'>
								ID: {ticket.id}
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
													<div
														className={`inline-block px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${getClassificationColor(
															ticket.change_classification
														)}`}
													>
														{t(
															`classifications.${ticket.change_classification}` as unknown as 'classifications.critical_error'
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
											<div
												className='prose prose-sm sm:prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed'
												dangerouslySetInnerHTML={{
													__html: ticket.human_reply,
												}}
											/>
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
											<div
												className='prose prose-sm sm:prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed'
												dangerouslySetInnerHTML={{ __html: ticket.ai_reply }}
											/>
										</div>
									</CardContent>
								</Card>
							)}
						</div>

						{/* Comment */}
						{ticket.comment && (
							<Card>
								<CardHeader>
									<CardTitle className='text-base sm:text-lg'>
										{t('modal.comment')}
									</CardTitle>
									<CardDescription className='text-xs sm:text-sm'>
										{t('modal.commentDesc')}
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

						{/* Review Actions */}
						<Card>
							<CardHeader>
								<CardTitle className='text-base sm:text-lg'>
									Review Actions
								</CardTitle>
								<CardDescription className='text-xs sm:text-sm'>
									Mark ticket status and approve AI answer
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
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

								{/* Status Toggle Buttons */}
								<div className='space-y-2'>
									<Label className='text-sm font-medium'>Review Status</Label>
									<div className='flex gap-2'>
										<Button
											variant={
												reviewStatus === 'processed' ? 'default' : 'outline'
											}
											size='sm'
											className='flex-1'
											onClick={() => handleStatusChange('processed')}
											disabled={isSaving || reviewStatus === 'processed'}
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
											onClick={() => handleStatusChange('unprocessed')}
											disabled={isSaving || reviewStatus === 'unprocessed'}
										>
											{isSaving && reviewStatus === 'unprocessed' ? (
												<span>{t('modal.saving')}</span>
											) : (
												t('modal.markAsUnprocessed')
											)}
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
