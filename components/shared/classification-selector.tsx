'use client'

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
	type NewClassificationType,
	CLASSIFICATION_PENALTIES,
	getClassificationColor,
	type ScoreGroup,
} from '@/constants/classification-types'
import { useTranslations } from 'next-intl'

const SCORE_GROUP_ORDER: ScoreGroup[] = ['good', 'needs_work', 'critical', 'excluded']

const CLASSIFICATIONS_BY_GROUP: Record<ScoreGroup, NewClassificationType[]> = {
	good: ['PERFECT_MATCH', 'STYLISTIC_EDIT', 'STRUCTURAL_FIX'],
	needs_work: ['TONAL_MISALIGNMENT', 'CONFUSING_VERBOSITY', 'MINOR_INFO_GAP'],
	critical: ['MAJOR_FUNCTIONAL_OMISSION', 'CRITICAL_FACT_ERROR'],
	excluded: ['EXCL_WORKFLOW_SHIFT', 'EXCL_DATA_DISCREPANCY', 'HUMAN_INCOMPLETE'],
}

interface ClassificationSelectorProps {
	value: string | null
	onChange: (value: string) => void
	disabled?: boolean
}

export function ClassificationSelector({
	value,
	onChange,
	disabled = false,
}: ClassificationSelectorProps) {
	const t = useTranslations('ticketsReview')

	return (
		<Accordion type='single' collapsible defaultValue='classification' className='w-full'>
			<AccordionItem value='classification' className='border rounded-lg'>
				<AccordionTrigger className='px-4 py-3 hover:no-underline'>
					<div className='flex items-center gap-3 text-left'>
						<span className='text-sm font-medium'>{t('modal.classificationSelector')}</span>
						{value && (
							<span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getClassificationColor(value)}`}>
								{t(`classifications.${value}` as any)}
							</span>
						)}
					</div>
				</AccordionTrigger>
				<AccordionContent className='px-4 pb-4'>
					<p className='text-xs text-muted-foreground mb-3'>{t('modal.classificationHint')}</p>
					<RadioGroup
						value={value ?? ''}
						onValueChange={onChange}
						disabled={disabled}
						className='space-y-3'
					>
						{SCORE_GROUP_ORDER.map(group => (
							<div key={group} className='space-y-1'>
								<p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
									{t(`scoreGroups.${group}` as any)}
								</p>
								<div className='grid grid-cols-1 sm:grid-cols-2 gap-0.5'>
									{CLASSIFICATIONS_BY_GROUP[group].map(type => {
										const score = CLASSIFICATION_PENALTIES[type]
										const scoreDisplay = score === null ? 'N/A' : `${100 + score}`
										return (
											<label
												key={type}
												className={`flex items-start gap-2 rounded px-2 py-1.5 cursor-pointer transition-colors ${
													value === type
														? getClassificationColor(type)
														: 'hover:bg-muted/50'
												}`}
											>
												<RadioGroupItem value={type} className='mt-0.5 shrink-0' />
												<div className='min-w-0'>
													<span className='text-xs font-medium'>
														{t(`classifications.${type}` as any)}
														<span className='text-muted-foreground font-normal ml-1'>({scoreDisplay})</span>
													</span>
													<p className='text-[10px] text-muted-foreground leading-tight'>
														{t(`classificationDescriptions.${type}` as any)}
													</p>
												</div>
											</label>
										)
									})}
								</div>
							</div>
						))}
					</RadioGroup>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	)
}
