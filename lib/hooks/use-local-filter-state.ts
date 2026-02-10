'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Generic hook for local filter state with deferred apply pattern.
 *
 * Manages local copies of filter values, syncs from props when props change,
 * and provides apply/reset/close handlers.
 *
 * Usage:
 * ```ts
 * const { values, setValue, handleApply, handleReset } = useLocalFilterState(
 *   { versions: filters.versions, categories: filters.categories },
 *   { onApply: onApplyFilters, onReset, onClose }
 * )
 * ```
 */
export function useLocalFilterState<T extends Record<string, unknown>>(
	initialValues: T,
	options: {
		onApply: (values: T) => void
		onReset: () => void
		onClose?: () => void
	}
) {
	// Create individual state entries for each field
	const [localValues, setLocalValues] = useState<T>(initialValues)

	// Track if this is the first render to avoid unnecessary sync
	const isFirstRender = useRef(true)

	// Stable key for detecting prop changes
	const filtersKey = useMemo(
		() => JSON.stringify(initialValues),
		[initialValues]
	)

	// Sync local state when props change (e.g., after reset)
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false
			return
		}
		setLocalValues(initialValues)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filtersKey])

	// Set a single field value
	const setValue = <K extends keyof T>(key: K, value: T[K]) => {
		setLocalValues(prev => ({ ...prev, [key]: value }))
	}

	// Apply all local values and close
	const handleApply = () => {
		options.onApply(localValues)
		options.onClose?.()
	}

	// Reset via parent callback (local state will sync via useEffect)
	const handleReset = () => {
		options.onReset()
	}

	return {
		values: localValues,
		setValue,
		handleApply,
		handleReset,
	}
}
