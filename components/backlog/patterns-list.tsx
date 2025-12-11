'use client'

import type { MainPattern } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '../ui/accordion'

interface PatternsListProps {
	patterns: MainPattern[]
}

/**
 * Patterns List - Displays main patterns identified in the backlog
 */
export function PatternsList({ patterns }: PatternsListProps) {
	const t = useTranslations()

	// Handle case where patterns is not an array (e.g., from JSON parsing)
	const patternsArray = Array.isArray(patterns) ? patterns : []

	if (patternsArray.length === 0) {
		return (
			<div className='flex items-center justify-center min-h-[200px] text-muted-foreground'>
				{t('backlogReports.detail.noPatterns')}
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			{patternsArray.map((pattern, index) => (
				<Card key={index}>
					<CardHeader className='pb-2'>
						<div className='space-y-2'>
							<div className='flex items-center gap-2 flex-wrap'>
								<Badge variant='outline'>#{pattern.rank}</Badge>
								<CardTitle className='text-lg'>{pattern.pattern_name}</CardTitle>
							</div>
							<Badge className='w-fit'>
								{pattern.volume} {t('backlogReports.card.tickets')}
							</Badge>
							<CardDescription className='text-sm'>
								{pattern.description}
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent>
						<Accordion type='single' collapsible className='w-full'>
							{/* Examples */}
							{pattern.examples && pattern.examples.length > 0 && (
								<AccordionItem value='examples'>
									<AccordionTrigger className='text-sm'>
										{t('backlogReports.detail.examples')} ({pattern.examples.length})
									</AccordionTrigger>
									<AccordionContent>
										<ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
											{pattern.examples.map((example, idx) => (
												<li key={idx}>{example}</li>
											))}
										</ul>
									</AccordionContent>
								</AccordionItem>
							)}

							{/* Business Insight */}
							{pattern.business_insight && (
								<AccordionItem value='insight'>
									<AccordionTrigger className='text-sm'>
										{t('backlogReports.detail.businessInsight')}
									</AccordionTrigger>
									<AccordionContent>
										<p className='text-sm text-muted-foreground'>
											{pattern.business_insight}
										</p>
									</AccordionContent>
								</AccordionItem>
							)}
						</Accordion>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
