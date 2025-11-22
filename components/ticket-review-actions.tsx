'use client'

/**
 * Ticket Review Actions Component
 *
 * Client component for review status and AI approval actions
 * Used in the full ticket detail page
 */

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
import { updateTicketReview } from '@/lib/actions/ticket-update-actions'
import { IconCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface TicketReviewActionsProps {
	ticketId: number
	initialReviewStatus: 'processed' | 'unprocessed' | null
	initialAiApproved: boolean | null
}

export function TicketReviewActions({
	ticketId,
	initialReviewStatus,
	initialAiApproved,
}: TicketReviewActionsProps) {
	const t = useTranslations('ticketsReview.modal')
	const [reviewStatus, setReviewStatus] = useState<'processed' | 'unprocessed'>(
		initialReviewStatus || 'unprocessed'
	)
	const [aiApproved, setAiApproved] = useState(initialAiApproved || false)
	const [isSaving, setIsSaving] = useState(false)

	// Update review status
	const handleStatusChange = async (newStatus: 'processed' | 'unprocessed') => {
		setIsSaving(true)
		setReviewStatus(newStatus) // Optimistic update

		const result = await updateTicketReview(ticketId, {
			reviewStatus: newStatus,
		})

		if (result.success) {
			toast.success(t('saved'))
		} else {
			// Revert on error
			setReviewStatus(initialReviewStatus || 'unprocessed')
			toast.error(result.error || 'Failed to update status')
		}

		setIsSaving(false)
	}

	// Update AI approval
	const handleAiApprovalChange = async (checked: boolean) => {
		setIsSaving(true)
		setAiApproved(checked) // Optimistic update

		const result = await updateTicketReview(ticketId, {
			aiApproved: checked,
		})

		if (result.success) {
			toast.success(t('saved'))
		} else {
			// Revert on error
			setAiApproved(initialAiApproved || false)
			toast.error(result.error || 'Failed to update AI approval')
		}

		setIsSaving(false)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Review Actions</CardTitle>
				<CardDescription>
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
						{t('approveAiAnswer')}
						{aiApproved && (
							<span className='text-xs text-green-600 dark:text-green-400'>
								({t('aiApproved')})
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
							variant={reviewStatus === 'processed' ? 'default' : 'outline'}
							size='sm'
							className='flex-1'
							onClick={() => handleStatusChange('processed')}
							disabled={isSaving || reviewStatus === 'processed'}
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
							onClick={() => handleStatusChange('unprocessed')}
							disabled={isSaving || reviewStatus === 'unprocessed'}
						>
							{isSaving && reviewStatus === 'unprocessed' ? (
								<span>{t('saving')}</span>
							) : (
								t('markAsUnprocessed')
							)}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
