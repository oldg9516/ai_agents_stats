/**
 * Israel timezone (Asia/Jerusalem) date utilities.
 *
 * All date pickers and default date ranges in the app use Israel timezone
 * since the business is Israel-based.
 */

export const ISRAEL_TZ = 'Asia/Jerusalem'

/**
 * Format a Date as "YYYY-MM-DD" in Israel timezone.
 * Used for displaying dates in <input type="date">.
 */
export function formatDateInIsraelTZ(date: Date): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: ISRAEL_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(date)
	const year = parts.find(p => p.type === 'year')!.value
	const month = parts.find(p => p.type === 'month')!.value
	const day = parts.find(p => p.type === 'day')!.value
	return `${year}-${month}-${day}`
}

/**
 * Parse "YYYY-MM-DD" as start (00:00:00) or end (23:59:59.999) of day in Israel timezone.
 * Returns a UTC Date that represents that moment in Israel.
 *
 * Example (Israel = UTC+2 in winter):
 *   parseDateInIsraelTZ("2026-02-21", false) → 2026-02-20T22:00:00.000Z
 *   parseDateInIsraelTZ("2026-02-21", true)  → 2026-02-21T21:59:59.999Z
 */
export function parseDateInIsraelTZ(dateStr: string, endOfDay: boolean): Date {
	const parts = dateStr.split('-').map(Number)
	const year = parts[0], month = parts[1], day = parts[2]
	if (!year || !month || !day) return new Date(NaN)

	// Use noon UTC as reference to get stable offset (avoids DST edge cases near midnight)
	const ref = new Date(Date.UTC(year, month - 1, day, 12))

	// Compute Israel UTC offset in ms
	const utcStr = ref.toLocaleString('en-US', {
		timeZone: 'UTC',
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
	})
	const ilStr = ref.toLocaleString('en-US', {
		timeZone: ISRAEL_TZ,
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
	})
	const offsetMs = new Date(ilStr).getTime() - new Date(utcStr).getTime()

	const h = endOfDay ? 23 : 0
	const m = endOfDay ? 59 : 0
	const s = endOfDay ? 59 : 0
	const ms = endOfDay ? 999 : 0

	// UTC time = Israel time - offset
	return new Date(Date.UTC(year, month - 1, day, h, m, s, ms) - offsetMs)
}

/**
 * Get today's date string "YYYY-MM-DD" in Israel timezone.
 */
export function todayInIsraelTZ(): string {
	return formatDateInIsraelTZ(new Date())
}

/**
 * Shift a "YYYY-MM-DD" date string by N days (positive = future, negative = past).
 * Pure date arithmetic, no timezone conversion needed.
 */
function shiftDateStr(dateStr: string, days: number): string {
	const parts = dateStr.split('-').map(Number)
	const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days))
	const y = d.getUTCFullYear()
	const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
	const da = String(d.getUTCDate()).padStart(2, '0')
	return `${y}-${mo}-${da}`
}

/**
 * Get start of today in Israel timezone (midnight Israel).
 */
export function startOfTodayInIsrael(): Date {
	return parseDateInIsraelTZ(todayInIsraelTZ(), false)
}

/**
 * Get end of today in Israel timezone (23:59:59.999 Israel).
 */
export function endOfTodayInIsrael(): Date {
	return parseDateInIsraelTZ(todayInIsraelTZ(), true)
}

/**
 * Get start of N days ago in Israel timezone.
 * N=0 → start of today, N=1 → start of yesterday, etc.
 */
export function startOfNDaysAgoInIsrael(n: number): Date {
	return parseDateInIsraelTZ(shiftDateStr(todayInIsraelTZ(), -n), false)
}
