'use client'

/**
 * Ticket Comment Editor Component
 *
 * Client component for editing manual ticket comments
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
import { Textarea } from '@/components/ui/textarea'
import { updateTicketReview } from '@/lib/actions/ticket-update-actions'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface TicketCommentEditorProps {
	ticketId: number
	initialComment: string | null
}

export function TicketCommentEditor({
	ticketId,
	initialComment,
}: TicketCommentEditorProps) {
	const t = useTranslations('ticketsReview.modal')
	const [manualComment, setManualComment] = useState(initialComment || '')
	const [isSaving, setIsSaving] = useState(false)

	const handleSaveComment = async () => {
		setIsSaving(true)

		const result = await updateTicketReview(ticketId, {
			manualComment: manualComment,
		})

		if (result.success) {
			toast.success(t('saved'))
		} else {
			toast.error(result.error || 'Failed to save comment')
		}

		setIsSaving(false)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t('comment')}</CardTitle>
				<CardDescription>{t('commentDesc')}</CardDescription>
			</CardHeader>
			<CardContent className='space-y-3'>
				<Textarea
					placeholder={t('commentPlaceholder')}
					value={manualComment}
					onChange={(e) => setManualComment(e.target.value)}
					className='min-h-[120px]'
					disabled={isSaving}
				/>
				<Button
					onClick={handleSaveComment}
					disabled={isSaving}
					className='w-full sm:w-auto'
					size='sm'
				>
					{isSaving ? t('saving') : t('saveComment')}
				</Button>
			</CardContent>
		</Card>
	)
}
