'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ACTION_TYPES } from '@/constants/action-types'
import type { ActionAnalysis, ActionAnalysisVerification } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface ActionAnalysisVerificationSectionProps {
	actionAnalysis: ActionAnalysis
	verification: ActionAnalysisVerification
	onVerificationChange: (verification: ActionAnalysisVerification) => void
	disabled?: boolean
}

export function ActionAnalysisVerificationSection({
	actionAnalysis,
	verification,
	onVerificationChange,
	disabled = false,
}: ActionAnalysisVerificationSectionProps) {
	const t = useTranslations('ticketsReview.modal.actionAnalysis')
	const tTypes = useTranslations('actionTypes')

	const handleFieldChange = (field: keyof ActionAnalysisVerification, value: boolean | string) => {
		onVerificationChange({ ...verification, [field]: value })
	}

	const correctedTypes = verification.corrected_action_types
	const isCorrection = correctedTypes !== null

	const handleToggleActionType = (type: string) => {
		const current = correctedTypes ?? []
		const next = current.includes(type)
			? current.filter((t) => t !== type)
			: [...current, type]
		onVerificationChange({ ...verification, corrected_action_types: next })
	}

	const handleResetCorrection = () => {
		onVerificationChange({ ...verification, corrected_action_types: null })
	}

	const handleStartCorrection = () => {
		onVerificationChange({ ...verification, corrected_action_types: [...actionAnalysis.action_type] })
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

			{/* Action Type — AI selected + correction */}
			<div className='p-3 rounded-md border border-muted-foreground/20 bg-background space-y-3'>
				<div className='flex items-center justify-between'>
					<p className='text-xs text-muted-foreground'>{t('actionType')}</p>
					{isCorrection ? (
						<Button
							variant='ghost'
							size='sm'
							className='h-6 text-xs px-2'
							onClick={handleResetCorrection}
							disabled={disabled}
						>
							{t('resetCorrection')}
						</Button>
					) : (
						<Button
							variant='ghost'
							size='sm'
							className='h-6 text-xs px-2'
							onClick={handleStartCorrection}
							disabled={disabled}
						>
							{t('correct')}
						</Button>
					)}
				</div>
				<div className='flex flex-wrap gap-1.5'>
					{actionAnalysis.action_type.length > 0 ? (
						actionAnalysis.action_type.map((type) => (
							<Badge key={type} variant='secondary' className='text-xs'>
								{tTypes(type as any)}
							</Badge>
						))
					) : (
						<span className='text-sm text-muted-foreground'>—</span>
					)}
				</div>
				{isCorrection && (
					<>
						<div className='border-t border-muted-foreground/10 pt-2'>
							<p className='text-xs text-muted-foreground mb-1.5'>{t('correctedActionTypes')}</p>
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-1'>
								{ACTION_TYPES.map((type) => (
									<label
										key={type}
										className='flex items-center space-x-2 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer'
									>
										<Checkbox
											checked={correctedTypes!.includes(type)}
											onCheckedChange={() => handleToggleActionType(type)}
											disabled={disabled}
										/>
										<span className='text-xs'>{tTypes(type)}</span>
									</label>
								))}
							</div>
						</div>
					</>
				)}
			</div>

			{/* Action Details */}
			<div className='p-3 rounded-md border border-muted-foreground/20 bg-background'>
				<p className='text-xs text-muted-foreground'>{t('actionDetails')}</p>
				<p className='text-sm'>{actionAnalysis.action_details || '—'}</p>
			</div>

			{/* Reasoning */}
			<div className='p-3 rounded-md border border-muted-foreground/20 bg-background'>
				<p className='text-xs text-muted-foreground'>{t('reasoning')}</p>
				<p className='text-sm'>{actionAnalysis.reasoning || '—'}</p>
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
