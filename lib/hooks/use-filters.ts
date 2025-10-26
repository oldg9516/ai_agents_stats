'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { DashboardFilters } from '@/lib/supabase/types'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'

const STORAGE_KEY = 'ai_stats_filters'

/**
 * Get default filter values
 */
function getDefaultFilters(): DashboardFilters {
	const now = new Date()
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(now.getDate() - 30)

	return {
		dateRange: {
			from: thirtyDaysAgo,
			to: now,
		},
		versions: [], // Empty = all versions
		categories: [], // Empty = all categories
		agents: QUALIFIED_AGENTS, // All qualified agents by default
	}
}

/**
 * Load filters from localStorage
 */
function loadFromStorage(): DashboardFilters | null {
	if (typeof window === 'undefined') return null

	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return null

		const parsed = JSON.parse(stored)
		// Convert date strings back to Date objects
		return {
			...parsed,
			dateRange: {
				from: new Date(parsed.dateRange.from),
				to: new Date(parsed.dateRange.to),
			},
		}
	} catch (error) {
		console.error('Error loading filters from storage:', error)
		return null
	}
}

/**
 * Save filters to localStorage
 */
function saveToStorage(filters: DashboardFilters) {
	if (typeof window === 'undefined') return

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
	} catch (error) {
		console.error('Error saving filters to storage:', error)
	}
}

/**
 * Parse filters from URL search params
 */
function parseFromURL(searchParams: URLSearchParams): Partial<DashboardFilters> {
	const filters: Partial<DashboardFilters> = {}

	// Date range
	const from = searchParams.get('from')
	const to = searchParams.get('to')
	if (from && to) {
		filters.dateRange = {
			from: new Date(from),
			to: new Date(to),
		}
	}

	// Versions
	const versions = searchParams.get('versions')
	if (versions) {
		filters.versions = versions.split(',').filter(Boolean)
	}

	// Categories
	const categories = searchParams.get('categories')
	if (categories) {
		filters.categories = categories.split(',').filter(Boolean)
	}

	// Agents
	const agents = searchParams.get('agents')
	if (agents) {
		filters.agents = agents.split(',').filter(Boolean)
	}

	return filters
}

/**
 * Convert filters to URL search params
 */
function filtersToURLParams(filters: DashboardFilters): URLSearchParams {
	const params = new URLSearchParams()

	// Date range
	params.set('from', filters.dateRange.from.toISOString().split('T')[0])
	params.set('to', filters.dateRange.to.toISOString().split('T')[0])

	// Versions (only if not empty)
	if (filters.versions.length > 0) {
		params.set('versions', filters.versions.join(','))
	}

	// Categories (only if not empty)
	if (filters.categories.length > 0) {
		params.set('categories', filters.categories.join(','))
	}

	// Agents (only if not all)
	if (filters.agents.length !== QUALIFIED_AGENTS.length) {
		params.set('agents', filters.agents.join(','))
	}

	return params
}

/**
 * Hook for managing dashboard filters
 *
 * Features:
 * - URL sync (shareable links)
 * - localStorage persistence
 * - Default values
 */
export function useFilters() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [filters, setFilters] = useState<DashboardFilters>(() => {
		// Priority: URL > localStorage > defaults
		const urlFilters = parseFromURL(searchParams)
		if (Object.keys(urlFilters).length > 0) {
			return { ...getDefaultFilters(), ...urlFilters }
		}

		const storedFilters = loadFromStorage()
		return storedFilters || getDefaultFilters()
	})

	// Sync filters to URL and localStorage
	const syncFilters = useCallback(
		(newFilters: DashboardFilters) => {
			setFilters(newFilters)
			saveToStorage(newFilters)

			// Update URL
			const params = filtersToURLParams(newFilters)
			router.push(`?${params.toString()}`, { scroll: false })
		},
		[router]
	)

	// Update individual filter values
	const updateFilters = useCallback(
		(updates: Partial<DashboardFilters>) => {
			const newFilters = { ...filters, ...updates }
			syncFilters(newFilters)
		},
		[filters, syncFilters]
	)

	// Reset filters to defaults
	const resetFilters = useCallback(() => {
		syncFilters(getDefaultFilters())
	}, [syncFilters])

	// Update date range
	const setDateRange = useCallback(
		(from: Date, to: Date) => {
			updateFilters({ dateRange: { from, to } })
		},
		[updateFilters]
	)

	// Update versions
	const setVersions = useCallback(
		(versions: string[]) => {
			updateFilters({ versions })
		},
		[updateFilters]
	)

	// Update categories
	const setCategories = useCallback(
		(categories: string[]) => {
			updateFilters({ categories })
		},
		[updateFilters]
	)

	// Update agents
	const setAgents = useCallback(
		(agents: string[]) => {
			// Ensure at least one agent is selected
			if (agents.length === 0) return
			updateFilters({ agents })
		},
		[updateFilters]
	)

	return {
		filters,
		setDateRange,
		setVersions,
		setCategories,
		setAgents,
		resetFilters,
	}
}
