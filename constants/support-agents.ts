import type { Weekday } from '@/lib/db/types'

/**
 * Weekday keys in display order (Sunday first — Israel work week).
 * These exact lowercase keys are what the n8n automation parses in `schedule`.
 */
export const WEEKDAY_KEYS: readonly Weekday[] = [
	'sun',
	'mon',
	'tue',
	'wed',
	'thu',
	'fri',
	'sat',
] as const

/** Default timezone for new agents (all current agents use this). */
export const DEFAULT_AGENT_TIMEZONE = 'Asia/Jerusalem'
