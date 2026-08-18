import { format } from 'date-fns'
import type { SentimentGranularity } from '@/constants/sentiment-categories'

/**
 * Label for one time bucket. Day and week show a date, month and year drop the noise.
 */
export function formatPeriodLabel(
	periodStart: string,
	granularity: SentimentGranularity
): string {
	const date = new Date(periodStart)
	if (Number.isNaN(date.getTime())) {
		return periodStart
	}
	switch (granularity) {
		case 'day':
			return format(date, 'dd.MM')
		case 'week':
			return format(date, 'dd.MM')
		case 'month':
			return format(date, 'LLL yyyy')
		case 'year':
			return format(date, 'yyyy')
		default:
			return format(date, 'dd.MM')
	}
}

/** Sentiment Index carries two decimals; a third is noise at these volumes */
export function formatSentimentIndex(value: number): string {
	return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
}
