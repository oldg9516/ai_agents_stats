'use client'

import type { CategoryStats } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { useMemo } from 'react'

interface StatsByCategoryProps {
	stats: CategoryStats
	total: number
}

/**
 * Stats by Category - Horizontal bar chart showing category distribution
 */
export function StatsByCategory({ stats, total }: StatsByCategoryProps) {
	const t = useTranslations()

	// Handle case where stats is not a valid object
	const safeStats = stats && typeof stats === 'object' && !Array.isArray(stats) ? stats : {}

	// Sort categories by count descending
	const sortedCategories = useMemo(() => {
		return Object.entries(safeStats).sort(([, a], [, b]) => b - a)
	}, [safeStats])

	if (sortedCategories.length === 0) {
		return null
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t('backlogReports.detail.statsByCategory')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className='space-y-4'>
					{sortedCategories.map(([category, count]) => {
						const percentage = total > 0 ? (count / total) * 100 : 0

						return (
							<div key={category} className='space-y-1'>
								<div className='flex items-center justify-between text-sm'>
									<span className='truncate max-w-[250px]' title={category}>
										{category}
									</span>
									<span className='text-muted-foreground shrink-0 ml-2'>
										{count} ({percentage.toFixed(1)}%)
									</span>
								</div>
								<Progress value={percentage} className='h-2' />
							</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
