'use client'

/**
 * Ticket sentiment path shapes (spec §6.2)
 *
 * A ticket that ends well after a dip and one that improved steadily both count as
 * improved in the Resolution Rate; this split tells them apart. "Volatile" is the one to
 * watch — the customer was let down at least once along the way.
 */

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { ChartCardWithTooltip } from './chart-card-with-tooltip'
import { SENTIMENT_PATTERNS } from '@/constants/sentiment-categories'
import type { SentimentPatternRow } from '@/lib/db/types'
import { cn } from '@/lib/utils'

interface SentimentPatternChartProps {
	data: SentimentPatternRow[]
}

const PATTERN_STYLES: Record<string, string> = {
	improved: 'bg-emerald-500',
	worsened: 'bg-red-500',
	volatile: 'bg-amber-500',
	unchanged: 'bg-muted-foreground/40',
}

export const SentimentPatternChart = memo(function SentimentPatternChart({
	data,
}: SentimentPatternChartProps) {
	const t = useTranslations('sentiment')
	const byPattern = new Map(data.map(row => [row.pattern, row]))
	const total = data.reduce((sum, row) => sum + row.ticketCount, 0)

	return (
		<ChartCardWithTooltip
			title={t('charts.patterns.title')}
			description={t('charts.patterns.description')}
			tooltipContent={t('charts.patterns.tooltip')}
		>
			{total === 0 ? (
				<p className='text-sm text-muted-foreground py-8 text-center'>{t('empty')}</p>
			) : (
				<div className='space-y-3'>
					{SENTIMENT_PATTERNS.map(pattern => {
						const row = byPattern.get(pattern)
						const share = row?.share ?? 0
						return (
							<div key={pattern} className='space-y-1'>
								<div className='flex items-center justify-between text-sm'>
									<span className='font-medium'>{t(`patterns.${pattern}`)}</span>
									<span className='text-muted-foreground tabular-nums'>
										{share.toFixed(1)}% · {row?.ticketCount ?? 0}
									</span>
								</div>
								<div className='h-2 rounded-full bg-muted overflow-hidden'>
									<div
										className={cn('h-full rounded-full', PATTERN_STYLES[pattern])}
										style={{ width: `${Math.min(100, share)}%` }}
									/>
								</div>
							</div>
						)
					})}
					<p className='text-xs text-muted-foreground pt-1'>
						{t('charts.patterns.total', { count: total })}
					</p>
				</div>
			)}
		</ChartCardWithTooltip>
	)
})
