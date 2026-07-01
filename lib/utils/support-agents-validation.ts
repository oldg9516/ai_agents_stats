import type { AgentSchedule, CreateSupportAgentInput, Weekday } from '@/lib/db/types'
import { WEEKDAY_KEYS } from '@/constants/support-agents'

/** True for a zero-padded 24h time like "09:00" or "16:30". */
export function isValidTime(value: string): boolean {
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/**
 * Validate a create/update payload. Returns an error message string, or null
 * if valid. Pure — safe to call on client and server.
 */
export function validateAgentInput(
	input: Pick<CreateSupportAgentInput, 'name' | 'email' | 'zohoAgentId' | 'schedule'>
): string | null {
	if (!input.name?.trim()) return 'Name is required'
	if (!input.email?.trim()) return 'Email is required'
	if (!input.zohoAgentId?.trim()) return 'Zoho agent id is required'

	for (const day of WEEKDAY_KEYS) {
		const slot = input.schedule[day]
		if (slot == null) continue // day off — allowed
		if (!isValidTime(slot.start) || !isValidTime(slot.end)) {
			return `Invalid time for ${day} (use HH:MM 24h)`
		}
	}
	return null
}

/**
 * Normalize a schedule: drop keys whose value is null so the stored JSONB only
 * contains working days (matches the automation's "missing === off" reading).
 * Kept explicit so overnight shifts (end <= start) are preserved untouched.
 */
export function normalizeSchedule(schedule: AgentSchedule): AgentSchedule {
	const out: AgentSchedule = {}
	for (const day of WEEKDAY_KEYS) {
		const slot = schedule[day]
		if (slot != null) out[day as Weekday] = { start: slot.start, end: slot.end }
	}
	return out
}
