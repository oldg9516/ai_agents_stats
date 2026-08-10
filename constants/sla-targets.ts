/**
 * SLA targets from the support KPI spec (TZ_SLA_Metrics_IT.pdf, August 2026).
 *
 * Fulfillment is capped at 100%: beating the target does not earn extra credit.
 *   Fulfillment = MIN(100%, target / received)
 */

/** First Response Time target — 24 hours */
export const FRT_TARGET_HOURS = 24

/**
 * On Hold Duration target — 72 hours per hold period.
 * Not in use yet: hold periods require a ticket status history we do not store.
 */
export const ON_HOLD_TARGET_HOURS = 72

/**
 * Reopen Rate target — at most 5% of closed requests reopening within 7 days.
 * Not in use yet: crediting a reopen needs the agent who closed the previous episode.
 */
export const REOPEN_TARGET_PERCENT = 5

/**
 * Resolution Time has no target yet — the spec calibrates it from actual medians once
 * the metric has run for a month or two.
 */

/**
 * Share of the target an agent achieved, capped at 100%.
 * Returns null when there is nothing to measure, so the UI can show a dash.
 */
export function fulfillmentPercent(
	targetHours: number,
	receivedHours: number,
	sampleSize: number
): number | null {
	if (sampleSize <= 0 || receivedHours <= 0) {
		return null
	}
	return Math.min(100, (targetHours / receivedHours) * 100)
}
