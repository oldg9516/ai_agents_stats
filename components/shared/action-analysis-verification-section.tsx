'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ActionAnalysis, ActionAnalysisVerification } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface ActionAnalysisVerificationSectionProps {
	actionAnalysis: ActionAnalysis
	verification: ActionAnalysisVerification
	onVerificationChange: (verification: ActionAnalysisVerification) => void
	disabled?: boolean
}

function getConfidenceBadgeColor(confidence: string): string {
	switch (confidence?.toLowerCase()) {
		case 'high':
			return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
		case 'medium':
			return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
		case 'low':
			return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
		default:
			return 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
	}
}

export function ActionAnalysisVerificationSection({
	actionAnalysis,
	verification,
	onVerificationChange,
	disabled = false,
}: ActionAnalysisVerificationSectionProps) {
	const t = useTranslations('ticketsReview.modal.actionAnalysis')

	const handleFieldChange = (field: keyof ActionAnalysisVerification, value: boolean | string) => {
		onVerificationChange({ ...verification, [field]: value })
	}

	return (
		<div className='rounded-lg border bg-muted/10 p-4 space-y-3'>
			<Label className='text-sm font-semibold'>{t('title')}</Label>

			{/* Requires System Action */}
			<div className='flex items-center justify-between p-3 rounded-md border border-muted-foreground/20 bg-background'>
				<div className='flex-1'>
					<p className='text-xs text-muted-foreground'>{t('requiresSystemAction')}</p>
					<p className='text-sm font-medium'>
						{actionAnalysis.requires_system_action === true
							? t('yes')
							: actionAnalysis.requires_system_action === false
								? t('no')
								: '—'}
					</p>
				</div>
				<div className='flex items-center space-x-2'>
					<Checkbox
						id='requires-system-action-correct'
						checked={verification.requires_system_action_correct}
						onCheckedChange={(checked) =>
							handleFieldChange('requires_system_action_correct', checked as boolean)
						}
						disabled={disabled}
					/>
					<Label htmlFor='requires-system-action-correct' className='text-xs cursor-pointer'>
						{t('correct')}
					</Label>
				</div>
			</div>

			{/* Action Type */}
			<div className='flex items-center justify-between p-3 rounded-md border border-muted-foreground/20 bg-background'>
				<div className='flex-1'>
					<p className='text-xs text-muted-foreground'>{t('actionType')}</p>
					<p className='text-sm font-medium'>{actionAnalysis.action_type || '—'}</p>
				</div>
				<div className='flex items-center space-x-2'>
					<Checkbox
						id='action-type-correct'
						checked={verification.action_type_correct}
						onCheckedChange={(checked) =>
							handleFieldChange('action_type_correct', checked as boolean)
						}
						disabled={disabled}
					/>
					<Label htmlFor='action-type-correct' className='text-xs cursor-pointer'>
						{t('correct')}
					</Label>
				</div>
			</div>

			{/* Action Details */}
			<div className='flex items-center justify-between p-3 rounded-md border border-muted-foreground/20 bg-background'>
				<div className='flex-1 mr-3'>
					<p className='text-xs text-muted-foreground'>{t('actionDetails')}</p>
					<p className='text-sm'>{actionAnalysis.action_details || '—'}</p>
				</div>
				<div className='flex items-center space-x-2 shrink-0'>
					<Checkbox
						id='action-details-correct'
						checked={verification.action_details_correct}
						onCheckedChange={(checked) =>
							handleFieldChange('action_details_correct', checked as boolean)
						}
						disabled={disabled}
					/>
					<Label htmlFor='action-details-correct' className='text-xs cursor-pointer'>
						{t('correct')}
					</Label>
				</div>
			</div>

			{/* Confidence */}
			<div className='flex items-center justify-between p-3 rounded-md border border-muted-foreground/20 bg-background'>
				<div className='flex-1'>
					<p className='text-xs text-muted-foreground'>{t('confidence')}</p>
					<Badge className={getConfidenceBadgeColor(actionAnalysis.confidence)}>
						{actionAnalysis.confidence || '—'}
					</Badge>
				</div>
				<div className='flex items-center space-x-2'>
					<Checkbox
						id='confidence-correct'
						checked={verification.confidence_correct}
						onCheckedChange={(checked) =>
							handleFieldChange('confidence_correct', checked as boolean)
						}
						disabled={disabled}
					/>
					<Label htmlFor='confidence-correct' className='text-xs cursor-pointer'>
						{t('correct')}
					</Label>
				</div>
			</div>

			{/* Reasoning */}
			<div className='flex items-center justify-between p-3 rounded-md border border-muted-foreground/20 bg-background'>
				<div className='flex-1 mr-3'>
					<p className='text-xs text-muted-foreground'>{t('reasoning')}</p>
					<p className='text-sm'>{actionAnalysis.reasoning || '—'}</p>
				</div>
				<div className='flex items-center space-x-2 shrink-0'>
					<Checkbox
						id='reasoning-correct'
						checked={verification.reasoning_correct}
						onCheckedChange={(checked) =>
							handleFieldChange('reasoning_correct', checked as boolean)
						}
						disabled={disabled}
					/>
					<Label htmlFor='reasoning-correct' className='text-xs cursor-pointer'>
						{t('correct')}
					</Label>
				</div>
			</div>

			{/* Verification Comment */}
			<div className='space-y-2'>
				<Label className='text-xs font-medium'>{t('comment')}</Label>
				<Textarea
					placeholder={t('commentPlaceholder')}
					value={verification.comment}
					onChange={(e) => handleFieldChange('comment', e.target.value)}
					className='min-h-[80px] resize-none text-sm'
					disabled={disabled}
				/>
			</div>
		</div>
	)
}
