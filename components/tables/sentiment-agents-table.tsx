'use client'

/**
 * Agent quality by episode-delta attribution (spec §3.5)
 *
 * Each transition between two customer requests is credited to the agent who answered the
 * earlier one — the customer's next message is a reaction to that reply. This is fairer
 * than crediting the whole ticket to whoever closed it.
 */

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { ChartCardWithTooltip } from '@/components/charts/chart-card-with-tooltip'
import type { SentimentAgentQualityRow } from '@/lib/db/types'
import { cn } from '@/lib/utils'

interface SentimentAgentsTableProps {
	data: SentimentAgentQualityRow[]
	/** Rows below this many transitions are hidden — a share off 3 replies means nothing */
	minTransitions?: number
}

function shareColor(share: number): string {
	if (share >= 35) {
		return 'text-green-600 dark:text-green-400 font-semibold'
	}
	if (share >= 20) {
		return 'text-yellow-600 dark:text-yellow-400 font-semibold'
	}
	return 'text-red-600 dark:text-red-400 font-semibold'
}

export const SentimentAgentsTable = memo(function SentimentAgentsTable({
	data,
	minTransitions = 5,
}: SentimentAgentsTableProps) {
	const t = useTranslations('sentiment')
	const rows = data.filter(row => row.transitions >= minTransitions)

	return (
		<ChartCardWithTooltip
			title={t('charts.agents.title')}
			description={t('charts.agents.description')}
			tooltipContent={t('charts.agents.tooltip')}
		>
			{rows.length === 0 ? (
				<p className='text-sm text-muted-foreground py-8 text-center'>{t('empty')}</p>
			) : (
				<div className='overflow-x-auto'>
					<table className='w-full min-w-[560px] text-sm'>
						<thead>
							<tr className='border-b'>
								<th className='text-left font-medium py-2 pr-4'>{t('charts.agents.agent')}</th>
								<th className='text-center font-medium py-2 px-2'>
									{t('charts.agents.transitions')}
								</th>
								<th className='text-center font-medium py-2 px-2'>{t('patterns.improved')}</th>
								<th className='text-center font-medium py-2 px-2'>{t('patterns.worsened')}</th>
								<th className='text-center font-medium py-2 px-2'>{t('patterns.unchanged')}</th>
								<th className='text-center font-medium py-2 pl-2'>
									{t('charts.agents.improvedShare')}
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(row => (
								<tr key={row.email} className='border-b last:border-0'>
									<td className='py-2 pr-4 font-medium truncate max-w-[220px]'>{row.email}</td>
									<td className='text-center py-2 px-2 text-muted-foreground'>
										{row.transitions}
									</td>
									<td className='text-center py-2 px-2 text-green-600 dark:text-green-400'>
										{row.improved}
									</td>
									<td className='text-center py-2 px-2 text-red-600 dark:text-red-400'>
										{row.worsened}
									</td>
									<td className='text-center py-2 px-2 text-muted-foreground'>
										{row.unchanged}
									</td>
									<td className={cn('text-center py-2 pl-2', shareColor(row.improvedShare))}>
										{row.improvedShare.toFixed(1)}%
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</ChartCardWithTooltip>
	)
})
