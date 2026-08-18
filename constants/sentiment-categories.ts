/**
 * AI sentiment categories — the single source of truth for the sentiment dashboard.
 *
 * Spec (IT_spec_sentiment_dashboard.docx §12) requires categories to live in config, not
 * in code: adding one is a new entry here plus a translation, never a rewrite of the
 * charts or the SQL. Ranks and weights are handed to the RPC functions as jsonb, so the
 * database reads them from this file too.
 *
 * - `rank` orders the scale for improved/worsened comparisons (1 = worst).
 * - `weight` feeds the Sentiment Index average.
 * - `severity` marks the categories counted in the Critical+Angry share.
 */

export interface SentimentCategory {
	/** Value stored in support_threads_data.sentiment */
	key: string
	rank: number
	weight: number
	/** Counted towards severity_share (Critical + Angry) */
	severity: boolean
	/** CSS variable used for charts and heatmap chips */
	colorVar: string
	/**
	 * Scales this category's share onto the shared heatmap colour scale. Critical sits at
	 * a few percent while Frustrated runs at 40%, so without a multiplier every Critical
	 * cell would read as calm and every Frustrated cell as on fire.
	 * Categories without a multiplier get a flat calm tint instead of a heat colour.
	 */
	heatMultiplier?: number
	/** Flat tint for categories that carry no alarm (Neutral, Positive) */
	calmClassName?: string
}

export const SENTIMENT_CATEGORIES: SentimentCategory[] = [
	{
		key: 'Critical',
		rank: 1,
		weight: -2,
		severity: true,
		colorVar: '--chart-5',
		heatMultiplier: 2.2,
	},
	{
		key: 'Angry',
		rank: 2,
		weight: -1,
		severity: true,
		colorVar: '--chart-9',
		heatMultiplier: 1.3,
	},
	{
		key: 'Frustrated',
		rank: 3,
		weight: -0.5,
		severity: false,
		colorVar: '--chart-4',
		heatMultiplier: 0.8,
	},
	{
		key: 'Neutral',
		rank: 4,
		weight: 0,
		severity: false,
		colorVar: '--chart-3',
		calmClassName: 'bg-muted/60 text-muted-foreground',
	},
	{
		key: 'Positive',
		rank: 5,
		weight: 1,
		severity: false,
		colorVar: '--chart-2',
		calmClassName: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
	},
]

export const SENTIMENT_KEYS = SENTIMENT_CATEGORIES.map(c => c.key)

export const SEVERITY_KEYS = SENTIMENT_CATEGORIES.filter(c => c.severity).map(c => c.key)

/** Ranks as the RPC functions expect them: {"Critical": 1, ...} */
export const SENTIMENT_RANKS: Record<string, number> = Object.fromEntries(
	SENTIMENT_CATEGORIES.map(c => [c.key, c.rank])
)

/** Weights as the RPC functions expect them: {"Critical": -2, ...} */
export const SENTIMENT_WEIGHTS: Record<string, number> = Object.fromEntries(
	SENTIMENT_CATEGORIES.map(c => [c.key, c.weight])
)

export function getSentimentCategory(key: string): SentimentCategory | undefined {
	return SENTIMENT_CATEGORIES.find(c => c.key === key)
}

/**
 * Heatmap colour steps for the Critical+Angry share (spec §4: five thresholds, kept in
 * config rather than in the markup).
 */
export const SEVERITY_THRESHOLDS = [
	{ upTo: 10, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
	{ upTo: 20, className: 'bg-lime-500/20 text-lime-800 dark:text-lime-300' },
	{ upTo: 30, className: 'bg-amber-500/25 text-amber-800 dark:text-amber-300' },
	{ upTo: 40, className: 'bg-orange-500/30 text-orange-800 dark:text-orange-200' },
	{ upTo: Infinity, className: 'bg-red-500/35 text-red-800 dark:text-red-200' },
]

export function getSeverityClassName(sharePercent: number): string {
	return (
		SEVERITY_THRESHOLDS.find(step => sharePercent < step.upTo)?.className ??
		SEVERITY_THRESHOLDS[SEVERITY_THRESHOLDS.length - 1].className
	)
}

/**
 * Cell colour for one category's share inside a heatmap row: the same five steps as the
 * severity scale, with the category's share scaled onto it first. Categories that carry no
 * alarm keep their flat tint.
 */
export function getHeatClassName(
	sharePercent: number,
	category: SentimentCategory
): string {
	if (category.heatMultiplier === undefined) {
		return category.calmClassName ?? ''
	}
	return getSeverityClassName(sharePercent * category.heatMultiplier)
}

/** Tenure buckets (spec §5.2) — non-overlapping whole-month ranges */
export const TENURE_BUCKET_ORDER = ['0-1', '2-3', '4-6', '7-11', '12-18', '19+', 'unknown']

/** Risk zone identified by the cancellation cohort analysis (spec §5.2) */
export const TENURE_RISK_BUCKETS = ['2-3', '4-6', '7-11']

/** Ticket sentiment path shapes (spec §6.2) */
export const SENTIMENT_PATTERNS = ['improved', 'worsened', 'volatile', 'unchanged'] as const
export type SentimentPattern = (typeof SENTIMENT_PATTERNS)[number]

/** Granularity levels the dashboard offers (spec §8) */
export const SENTIMENT_GRANULARITIES = ['day', 'week', 'month', 'year'] as const
export type SentimentGranularity = (typeof SENTIMENT_GRANULARITIES)[number]

/**
 * Sentiment classification started mid-June 2026; earlier requests carry no value.
 * The dashboard shows this so an empty bucket never reads as "customers were neutral"
 * (spec §11.3).
 */
export const SENTIMENT_DATA_AVAILABLE_FROM = '2026-06-16'
