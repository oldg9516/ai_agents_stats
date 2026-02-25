/**
 * Store Slice Factory — eliminates boilerplate for filter CRUD operations.
 *
 * Every filter slice follows the same pattern:
 * - getDefaultFilters() with a date range
 * - setDateRange, resetFilters, updateFilters
 * - per-field setters that spread one field into filters
 * - optional side effects on any filter change (e.g., pagination reset)
 *
 * This factory extracts those into reusable helpers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { endOfTodayInIsrael, startOfNDaysAgoInIsrael } from '@/lib/utils/date-tz'

/**
 * Creates a default date range: from N days ago (start of day) to end of today.
 * Dates are computed in Israel timezone (Asia/Jerusalem) — the business timezone.
 */
export function getDefaultDateRange(days: number): { from: Date; to: Date } {
	return {
		from: startOfNDaysAgoInIsrael(days - 1),
		to: endOfTodayInIsrael(),
	}
}

type WithDateRange = { dateRange: { from: Date; to: Date } }

/**
 * Generates standard filter CRUD operations for a Zustand slice.
 *
 * Returns: `{ setDateRange, resetFilters, updateFilters, setField }`
 *
 * @param set           Zustand set function from StateCreator
 * @param filtersKey    State key where filters live (e.g. 'dashboardFilters')
 * @param getDefaults   Factory returning default filter values
 * @param sideEffects   Extra partial state merged on every filter mutation (e.g. pagination reset)
 */
export function filterSliceActions<TFilters extends WithDateRange>(
	set: (fn: any) => void,
	filtersKey: string,
	getDefaults: () => TFilters,
	sideEffects?: Record<string, unknown>
) {
	const extra = sideEffects ?? {}

	const setField = <K extends keyof TFilters>(field: K, value: TFilters[K]) =>
		set((state: any) => ({
			[filtersKey]: { ...state[filtersKey], [field]: value },
			...extra,
		}))

	return {
		setDateRange: (from: Date, to: Date) =>
			set((state: any) => ({
				[filtersKey]: { ...state[filtersKey], dateRange: { from, to } },
				...extra,
			})),

		resetFilters: () =>
			set({ [filtersKey]: getDefaults(), ...extra }),

		updateFilters: (filters: Partial<TFilters>) =>
			set((state: any) => ({
				[filtersKey]: { ...state[filtersKey], ...filters },
				...extra,
			})),

		setField,
	}
}
