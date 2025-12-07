'use client'

/**
 * Ticket Review Actions Component
 *
 * Combined component for comment, AI approval, and review status
 * Saves comment and AI approval when marking as processed
 * Used in the full ticket detail page
 */

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
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { REVIEWER_AGENTS } from '@/constants/qualified-agents'
import { updateTicketReview } from '@/lib/actions/ticket-update-actions'
import { triggerTicketsRefresh } from '@/lib/hooks/use-paginated-tickets'
import { IconCheck } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface TicketReviewActionsProps {
	ticketId: number
	initialReviewStatus: 'processed' | 'unprocessed' | null
	initialAiApproved: boolean | null
	initialComment: string | null
	initialReviewerName?: string | null
}

export function TicketReviewActions({
	ticketId,
	initialReviewStatus,
	initialAiApproved,
	initialComment,
	initialReviewerName,
}: TicketReviewActionsProps) {
	const t = useTranslations('ticketsReview.modal')
	const router = useRouter()
	const [reviewStatus, setReviewStatus] = useState<'processed' | 'unprocessed'>(
		initialReviewStatus || 'unprocessed'
	)
	const [aiApproved, setAiApproved] = useState(initialAiApproved || false)
	const [manualComment, setManualComment] = useState(initialComment || '')
	const [selectedReviewer, setSelectedReviewer] = useState<string | null>(
		initialReviewerName || null
	)
	const [isSaving, setIsSaving] = useState(false)

	// Handle AI approval checkbox change (local state only, no API call)
	const handleAiApprovalChange = (checked: boolean) => {
		setAiApproved(checked)
	}

	// Mark as processed - saves comment, AI approval, reviewer name, and status
	const handleMarkAsProcessed = async () => {
		setIsSaving(true)
		setReviewStatus('processed') // Optimistic update

		const result = await updateTicketReview(ticketId, {
			reviewStatus: 'processed',
			aiApproved: aiApproved,
			manualComment: manualComment,
			reviewerName: selectedReviewer || undefined,
		})

		if (result.success) {
			toast.success(t('saved'))
			// Trigger table refresh via custom event
			triggerTicketsRefresh()
			router.refresh()
		} else {
			// Revert on error
			setReviewStatus(initialReviewStatus || 'unprocessed')
			toast.error(result.error || t('saveFailed'))
		}

		setIsSaving(false)
	}

	// Mark as unprocessed
	const handleMarkAsUnprocessed = async () => {
		setIsSaving(true)
		setReviewStatus('unprocessed') // Optimistic update

		const result = await updateTicketReview(ticketId, {
			reviewStatus: 'unprocessed',
		})

		if (result.success) {
			toast.success(t('saved'))
			// Trigger table refresh via custom event
			triggerTicketsRefresh()
			router.refresh()
		} else {
			// Revert on error
			setReviewStatus(initialReviewStatus || 'unprocessed')
			toast.error(result.error || t('saveFailed'))
		}

		setIsSaving(false)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t('reviewActions')}</CardTitle>
				<CardDescription>{t('reviewActionsDesc')}</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Reviewer Selection */}
				<div className='space-y-2'>
					<Label className='text-sm font-medium'>{t('reviewer')}</Label>
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
					<Label className='text-sm font-medium'>{t('comment')}</Label>
					<Textarea
						placeholder={t('commentPlaceholder')}
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
						{t('approveAiAnswer')}
						{aiApproved && (
							<span className='text-xs text-green-600 dark:text-green-400'>
								({t('aiApproved')})
							</span>
						)}
					</Label>
				</div>

				<Separator />

				{/* Status Buttons */}
				<div className='space-y-2'>
					<Label className='text-sm font-medium'>{t('reviewStatus')}</Label>
					<div className='flex gap-2'>
						<Button
							variant={reviewStatus === 'processed' ? 'default' : 'outline'}
							size='sm'
							className='flex-1'
							onClick={handleMarkAsProcessed}
							disabled={isSaving}
						>
							{isSaving && reviewStatus === 'processed' ? (
								<span>{t('saving')}</span>
							) : (
								t('markAsProcessed')
							)}
						</Button>
						<Button
							variant={reviewStatus === 'unprocessed' ? 'default' : 'outline'}
							size='sm'
							className='flex-1'
							onClick={handleMarkAsUnprocessed}
							disabled={isSaving || reviewStatus === 'unprocessed'}
						>
							{isSaving && reviewStatus === 'unprocessed' ? (
								<span>{t('saving')}</span>
							) : (
								t('markAsUnprocessed')
							)}
						</Button>
					</div>
					<p className='text-xs text-muted-foreground'>{t('processedHint')}</p>
				</div>
			</CardContent>
		</Card>
	)
}
