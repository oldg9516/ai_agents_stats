'use client'

/**
 * Support Filters Hook
 *
 * Manages filter state for Support Overview with URL sync and localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SupportFilters } from '../supabase/types'

const STORAGE_KEY = 'support-filters'

/**
 * Get default filters
 */
function getDefaultFilters(): SupportFilters {
	// Default: last 30 days
	const to = new Date()
	const from = new Date()
	from.setDate(from.getDate() - 30)

	return {
		dateRange: { from, to },
		statuses: [],
		requestTypes: [],
		requirements: [],
		versions: [],
	}
}

/**
 * Load filters from localStorage
 */
function loadFiltersFromStorage(): SupportFilters | null {
	if (typeof window === 'undefined') return null

	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return null

		const parsed = JSON.parse(stored)
		return {
			...parsed,
			dateRange: {
				from: new Date(parsed.dateRange.from),
				to: new Date(parsed.dateRange.to),
			},
		}
	} catch (error) {
		console.error('Failed to load filters from storage:', error)
		return null
	}
}

/**
 * Save filters to localStorage
 */
function saveFiltersToStorage(filters: SupportFilters) {
	if (typeof window === 'undefined') return

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
	} catch (error) {
		console.error('Failed to save filters to storage:', error)
	}
}

/**
 * Parse filters from URL search params
 */
function parseFiltersFromURL(searchParams: URLSearchParams): Partial<SupportFilters> {
	const filters: Partial<SupportFilters> = {}

	// Date range
	const fromParam = searchParams.get('from')
	const toParam = searchParams.get('to')
	if (fromParam && toParam) {
		filters.dateRange = {
			from: new Date(fromParam),
			to: new Date(toParam),
		}
	}

	// Statuses
	const statusesParam = searchParams.get('statuses')
	if (statusesParam) {
		filters.statuses = statusesParam.split(',').filter(Boolean)
	}

	// Request types
	const requestTypesParam = searchParams.get('requestTypes')
	if (requestTypesParam) {
		filters.requestTypes = requestTypesParam.split(',').filter(Boolean)
	}

	// Requirements
	const requirementsParam = searchParams.get('requirements')
	if (requirementsParam) {
		filters.requirements = requirementsParam.split(',').filter(Boolean)
	}

	// Versions
	const versionsParam = searchParams.get('versions')
	if (versionsParam) {
		filters.versions = versionsParam.split(',').filter(Boolean)
	}

	return filters
}

/**
 * Convert filters to URL search params
 */
function filtersToURLParams(filters: SupportFilters): string {
	const params = new URLSearchParams()

	params.set('from', filters.dateRange.from.toISOString().split('T')[0])
	params.set('to', filters.dateRange.to.toISOString().split('T')[0])

	if (filters.statuses.length > 0) {
		params.set('statuses', filters.statuses.join(','))
	}
	if (filters.requestTypes.length > 0) {
		params.set('requestTypes', filters.requestTypes.join(','))
	}
	if (filters.requirements.length > 0) {
		params.set('requirements', filters.requirements.join(','))
	}
	if (filters.versions.length > 0) {
		params.set('versions', filters.versions.join(','))
	}

	return params.toString()
}

export function useSupportFilters() {
	const router = useRouter()
	const searchParams = useSearchParams()

	// Initialize filters from URL > localStorage > defaults
	const [filters, setFilters] = useState<SupportFilters>(() => {
		// Try URL first
		const urlFilters = parseFiltersFromURL(searchParams)
		if (Object.keys(urlFilters).length > 0) {
			return { ...getDefaultFilters(), ...urlFilters }
		}

		// Try localStorage
		const storedFilters = loadFiltersFromStorage()
		if (storedFilters) {
			return storedFilters
		}

		// Use defaults
		return getDefaultFilters()
	})

	// Sync filters to URL and localStorage when they change
	useEffect(() => {
		const queryString = filtersToURLParams(filters)
		router.replace(`?${queryString}`, { scroll: false })
		saveFiltersToStorage(filters)
	}, [filters, router])

	// Update date range
	const setDateRange = useCallback((from: Date, to: Date) => {
		setFilters((prev) => ({
			...prev,
			dateRange: { from, to },
		}))
	}, [])

	// Update statuses
	const setStatuses = useCallback((statuses: string[]) => {
		setFilters((prev) => ({ ...prev, statuses }))
	}, [])

	// Update request types
	const setRequestTypes = useCallback((requestTypes: string[]) => {
		setFilters((prev) => ({ ...prev, requestTypes }))
	}, [])

	// Update requirements
	const setRequirements = useCallback((requirements: string[]) => {
		setFilters((prev) => ({ ...prev, requirements }))
	}, [])

	// Update versions
	const setVersions = useCallback((versions: string[]) => {
		setFilters((prev) => ({ ...prev, versions }))
	}, [])

	// Reset all filters
	const resetFilters = useCallback(() => {
		setFilters(getDefaultFilters())
	}, [])

	return {
		filters,
		setDateRange,
		setStatuses,
		setRequestTypes,
		setRequirements,
		setVersions,
		resetFilters,
	}
}
