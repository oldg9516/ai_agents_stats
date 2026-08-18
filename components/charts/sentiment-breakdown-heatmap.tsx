'use client'

/**
 * Sentiment breakdown heatmap
 *
 * One row per bucket — a subcategory, a tenure band or a weekday — with the share of
 * each sentiment category and the Critical+Angry severity share driving the cell colour
 * (spec §4, §5, §7). Thresholds and category colours come from
 * constants/sentiment-categories.ts, so a new category or a re-tuned scale needs no edit
 * here.
 */

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { ChartCardWithTooltip } from './chart-card-with-tooltip'
import {
	SENTIMENT_CATEGORIES,
	SEVERITY_THRESHOLDS,
	getHeatClassName,
	getSeverityClassName,
} from '@/constants/sentiment-categories'
import type { SentimentBreakdownRow } from '@/lib/db/types'
import { cn } from '@/lib/utils'

interface SentimentBreakdownHeatmapProps {
	title: string
	description?: string
	tooltipContent?: string
	rows: SentimentBreakdownRow[]
	/** Bucket label renderer — weekday numbers and tenure bands need translating */
	renderBucketLabel?: (bucketKey: string) => string
	/** Hide buckets below this volume; a share off 3 requests is noise (spec §7) */
	minEpisodes?: number
	emptyLabel: string
}

export const SentimentBreakdownHeatmap = memo(function SentimentBreakdownHeatmap({
	title,
	description,
	tooltipContent,
	rows,
	renderBucketLabel,
	minEpisodes = 0,
	emptyLabel,
}: SentimentBreakdownHeatmapProps) {
	const t = useTranslations('sentiment')
	const visibleRows = rows.filter(row => row.episodeCount >= minEpisodes)

	if (visibleRows.length === 0) {
		return (
			<ChartCardWithTooltip
				title={title}
				description={description}
				tooltipContent={tooltipContent}
			>
				<p className='text-sm text-muted-foreground py-8 text-center'>{emptyLabel}</p>
			</ChartCardWithTooltip>
		)
	}

	return (
		<ChartCardWithTooltip
			title={title}
			description={description}
			tooltipContent={tooltipContent}
		>
			<div className='overflow-x-auto'>
				<table className='w-full min-w-[640px] text-sm'>
					<thead>
						<tr className='border-b'>
							<th className='text-left font-medium py-2 pr-4'>{t('heatmap.bucket')}</th>
							<th className='text-center font-medium py-2 px-2'>
								{t('heatmap.episodes')}
							</th>
							{SENTIMENT_CATEGORIES.map(category => (
								<th
									key={category.key}
									className='text-center font-medium py-2 px-2 whitespace-nowrap'
								>
									{t(`categories.${category.key}`)}
								</th>
							))}
							<th className='text-center font-medium py-2 pl-2 whitespace-nowrap'>
								{t('heatmap.severity')}
							</th>
						</tr>
					</thead>
					<tbody>
						{visibleRows.map(row => (
							<tr key={row.bucketKey} className='border-b last:border-0'>
								<td className='py-2 pr-4 font-medium max-w-[260px] truncate'>
									{renderBucketLabel ? renderBucketLabel(row.bucketKey) : row.bucketKey}
								</td>
								<td className='text-center py-2 px-2 text-muted-foreground'>
									{row.episodeCount}
								</td>
								{SENTIMENT_CATEGORIES.map(category => {
									const count = row.distribution[category.key] ?? 0
									const share = row.episodeCount > 0 ? (count / row.episodeCount) * 100 : 0
									return (
										<td key={category.key} className='py-1 px-1'>
											<span
												className={cn(
													'block rounded px-2 py-1.5 text-center font-medium tabular-nums',
													getHeatClassName(share, category)
												)}
											>
												{share.toFixed(1)}%
											</span>
										</td>
									)
								})}
								<td className='py-1 pl-1'>
									<span
										className={cn(
											'block rounded px-2 py-1.5 text-center font-bold tabular-nums',
											getSeverityClassName(row.severityShare)
										)}
									>
										{row.severityShare.toFixed(1)}%
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Colour legend for the severity scale */}
			<div className='flex flex-wrap items-center gap-2 mt-4 text-xs text-muted-foreground'>
				<span>{t('heatmap.legend')}</span>
				{SEVERITY_THRESHOLDS.map((step, index) => {
					const from = index === 0 ? 0 : SEVERITY_THRESHOLDS[index - 1].upTo
					return (
						<span
							key={step.className}
							className={cn('rounded px-2 py-0.5 font-medium', step.className)}
						>
							{Number.isFinite(step.upTo) ? `${from}–${step.upTo}%` : `${from}%+`}
						</span>
					)
				})}
			</div>
			<p className='text-xs text-muted-foreground mt-2'>{t('heatmap.scaleNote')}</p>
		</ChartCardWithTooltip>
	)
})
