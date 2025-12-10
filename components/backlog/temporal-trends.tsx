'use client'

import type { TemporalTrend } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { IconTrendingUp } from '@tabler/icons-react'

interface TemporalTrendsProps {
	trends: TemporalTrend[]
}

/**
 * Temporal Trends - Displays time-based patterns and observations
 */
export function TemporalTrends({ trends }: TemporalTrendsProps) {
	const t = useTranslations()

	// Handle case where trends is not an array (e.g., from JSON parsing)
	const trendsArray = Array.isArray(trends) ? trends : []

	if (trendsArray.length === 0) {
		return (
			<div className='flex items-center justify-center min-h-[200px] text-muted-foreground'>
				{t('backlogReports.detail.noTrends')}
			</div>
		)
	}

	return (
		<div className='grid gap-4 md:grid-cols-2'>
			{trendsArray.map((trend, index) => (
				<Card key={index}>
					<CardHeader className='pb-2'>
						<div className='flex items-start gap-2'>
							<IconTrendingUp className='h-5 w-5 text-primary mt-0.5 shrink-0' />
							<div>
								<CardTitle className='text-base'>{trend.observation}</CardTitle>
								<CardDescription className='mt-1'>
									{trend.timeframe}
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-sm'>
							<span className='font-medium'>
								{t('backlogReports.detail.possibleCause')}:
							</span>{' '}
							<span className='text-muted-foreground'>{trend.possible_cause}</span>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
