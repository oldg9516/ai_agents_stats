'use client'

import type { DaySchedule } from '@/lib/db/types'

/**
 * Read-only display of one weekday's schedule: "09:00–16:30" or "Off".
 * `offLabel` is passed from the translated parent so this stays i18n-agnostic.
 */
export function AgentScheduleCell({
	slot,
	offLabel,
}: {
	slot: DaySchedule | undefined
	offLabel: string
}) {
	if (slot == null) {
		return <span className='text-muted-foreground text-xs'>{offLabel}</span>
	}
	return (
		<span className='text-xs tabular-nums whitespace-nowrap'>
			{slot.start}–{slot.end}
		</span>
	)
}
