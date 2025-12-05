'use client'

/**
 * Ticket Changes Accordion Component
 *
 * Displays AI change suggestions in a collapsible accordion format.
 * Shows type, reason, example, and description for each change.
 */

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface ChangeItem {
	type: string
	reason: string
	example: string
	description: string
}

interface TicketChangesAccordionProps {
	changes: ChangeItem[] | null | undefined
}

/**
 * Get badge color based on change type
 */
function getChangeTypeBadgeColor(type: string): string {
	switch (type) {
		case 'info_removed':
			return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
		case 'tone':
			return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
		case 'structure':
			return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
		case 'info_added':
			return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
		case 'accuracy':
			return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
		default:
			return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
	}
}

export function TicketChangesAccordion({
	changes,
}: TicketChangesAccordionProps) {
	const t = useTranslations('ticketsReview.changes')

	// Parse changes if it's a string (JSON)
	let parsedChanges: ChangeItem[] | null = null

	if (changes) {
		if (typeof changes === 'string') {
			try {
				parsedChanges = JSON.parse(changes)
			} catch (e) {
				console.error('Error parsing changes JSON:', e)
				return null
			}
		} else if (Array.isArray(changes)) {
			parsedChanges = changes
		}
	}

	// Don't render if no changes
	if (!parsedChanges || parsedChanges.length === 0) {
		return null
	}

	return (
		<div className='border rounded-lg bg-card overflow-hidden'>
			<Accordion type='single' collapsible className='w-full'>
				<AccordionItem value='changes' className='border-none'>
					<AccordionTrigger className='px-4 sm:px-6 py-4 hover:no-underline'>
						<div className='flex items-center gap-3'>
							<span className='text-sm sm:text-base font-semibold'>
								{t('title')}
							</span>
							<Badge variant='secondary' className='text-xs'>
								{parsedChanges.length}
							</Badge>
						</div>
					</AccordionTrigger>
					<AccordionContent className='px-4 sm:px-6 pb-4'>
						<div className='space-y-4 pt-2'>
							{parsedChanges.map((change, index) => (
								<div
									key={index}
									className='rounded-lg border bg-muted/30 p-3 sm:p-4 space-y-3'
								>
									{/* Header with type badge */}
									<div className='flex items-start justify-between gap-2'>
										<Badge
											variant='outline'
											className={`text-xs ${getChangeTypeBadgeColor(change.type)}`}
										>
											{t(`types.${change.type}`, { defaultValue: change.type })}
										</Badge>
									</div>

									{/* Description */}
									{change.description && (
										<div>
											<p className='text-xs font-medium text-muted-foreground mb-1'>
												{t('description')}
											</p>
											<p className='text-xs sm:text-sm leading-relaxed'>
												{change.description}
											</p>
										</div>
									)}

									{/* Reason */}
									{change.reason && (
										<div>
											<p className='text-xs font-medium text-muted-foreground mb-1'>
												{t('reason')}
											</p>
											<p className='text-xs sm:text-sm leading-relaxed text-muted-foreground'>
												{change.reason}
											</p>
										</div>
									)}

									{/* Example */}
									{change.example && (
										<div>
											<p className='text-xs font-medium text-muted-foreground mb-1'>
												{t('example')}
											</p>
											<div className='rounded bg-muted p-2 sm:p-3'>
												<p className='text-xs sm:text-sm leading-relaxed font-mono whitespace-pre-wrap'>
													{change.example}
												</p>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	)
}
