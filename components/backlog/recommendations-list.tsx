'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '../ui/card'
import { IconBulb } from '@tabler/icons-react'

interface RecommendationsListProps {
	recommendations: string[]
}

/**
 * Recommendations List - Displays AI-generated recommendations
 */
export function RecommendationsList({ recommendations }: RecommendationsListProps) {
	const t = useTranslations()

	// Handle case where recommendations is not an array (e.g., from JSON parsing)
	const recommendationsArray = Array.isArray(recommendations) ? recommendations : []

	if (recommendationsArray.length === 0) {
		return (
			<div className='flex items-center justify-center min-h-[200px] text-muted-foreground'>
				{t('backlogReports.detail.noRecommendations')}
			</div>
		)
	}

	return (
		<div className='space-y-3'>
			{recommendationsArray.map((recommendation, index) => (
				<Card key={index}>
					<CardContent className='pt-4'>
						<div className='flex items-start gap-3'>
							<div className='flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0'>
								<IconBulb className='h-4 w-4 text-primary' />
							</div>
							<div className='flex-1'>
								<div className='text-xs text-muted-foreground mb-1'>
									{t('backlogReports.detail.recommendation')} #{index + 1}
								</div>
								<p className='text-sm'>{recommendation}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
