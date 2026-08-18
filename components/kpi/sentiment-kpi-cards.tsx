'use client'

/**
 * Sentiment KPI tiles
 *
 * Values come from the latest bucket of the selected range, and the delta compares it with
 * the bucket before it (spec §8.1: kpi_current vs kpi_previous). With a week granularity
 * that reads as "against last week".
 */

import { useTranslations } from 'next-intl'
import { KPICard } from './kpi-card'
import {
	IconMoodSmile,
	IconFlame,
	IconArrowUpRight,
	IconArrowDownRight,
} from '@tabler/icons-react'
import { SEVERITY_KEYS } from '@/constants/sentiment-categories'
import { formatSentimentIndex } from '@/lib/utils/sentiment-format'
import type { SentimentTimeseriesBucket, TrendData } from '@/lib/db/types'

interface SentimentKpiCardsProps {
	data: SentimentTimeseriesBucket[]
}

function severityShare(bucket: SentimentTimeseriesBucket): number {
	if (bucket.episodeCount === 0) {
		return 0
	}
	const severe = SEVERITY_KEYS.reduce(
		(sum, key) => sum + (bucket.distribution[key] ?? 0),
		0
	)
	return (severe / bucket.episodeCount) * 100
}

/**
 * Trend for a metric where a higher number is better (index, resolution rate).
 * Pass `lowerIsBetter` for severity and worsened rates so the arrow colour matches
 * the business meaning rather than the arithmetic.
 */
function buildTrend(
	current: number,
	previous: number | undefined,
	lowerIsBetter = false
): TrendData | undefined {
	if (previous === undefined) {
		return undefined
	}
	const value = current - previous
	const percentage = previous !== 0 ? (value / Math.abs(previous)) * 100 : 0
	const improved = lowerIsBetter ? value < 0 : value > 0
	return {
		value: Number(value.toFixed(2)),
		percentage: Number(percentage.toFixed(1)),
		direction: value === 0 ? 'neutral' : improved ? 'up' : 'down',
	}
}

export function SentimentKpiCards({ data }: SentimentKpiCardsProps) {
	const t = useTranslations('sentiment')
	const current = data.at(-1)
	const previous = data.at(-2)

	if (!current) {
		return (
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				{['index', 'severity', 'resolution', 'worsened'].map(key => (
					<KPICard
						key={key}
						title={t(`kpi.${key}.title`)}
						value='—'
						description={t(`kpi.${key}.description`)}
						tooltipContent={t(`kpi.${key}.tooltip`)}
					/>
				))}
			</div>
		)
	}

	const currentSeverity = severityShare(current)
	const previousSeverity = previous ? severityShare(previous) : undefined

	return (
		<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
			<KPICard
				title={t('kpi.index.title')}
				value={formatSentimentIndex(current.sentimentIndex)}
				trend={buildTrend(current.sentimentIndex, previous?.sentimentIndex)}
				icon={<IconMoodSmile />}
				description={t('kpi.index.description', { count: current.episodeCount })}
				tooltipContent={t('kpi.index.tooltip')}
			/>
			<KPICard
				title={t('kpi.severity.title')}
				value={`${currentSeverity.toFixed(1)}%`}
				trend={buildTrend(currentSeverity, previousSeverity, true)}
				icon={<IconFlame />}
				description={t('kpi.severity.description')}
				tooltipContent={t('kpi.severity.tooltip')}
			/>
			<KPICard
				title={t('kpi.resolution.title')}
				value={`${current.resolutionRate.toFixed(1)}%`}
				trend={buildTrend(current.resolutionRate, previous?.resolutionRate)}
				icon={<IconArrowUpRight />}
				description={t('kpi.resolution.description', { count: current.ticketCount })}
				tooltipContent={t('kpi.resolution.tooltip')}
			/>
			<KPICard
				title={t('kpi.worsened.title')}
				value={`${current.worsenedRate.toFixed(1)}%`}
				trend={buildTrend(current.worsenedRate, previous?.worsenedRate, true)}
				icon={<IconArrowDownRight />}
				description={t('kpi.worsened.description')}
				tooltipContent={t('kpi.worsened.tooltip')}
			/>
		</div>
	)
}
