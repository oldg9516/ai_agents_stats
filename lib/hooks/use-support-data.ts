'use client'

/**
 * Support Data Hook
 *
 * Fetches all support overview data with real-time updates
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/client'
import type {
	SupportKPIs,
	StatusDistribution,
	ResolutionTimeData,
	SankeyData,
	CorrelationCell,
	SupportThread,
	SupportFilters,
} from '../supabase/types'
import {
	fetchSupportKPIs,
	fetchStatusDistribution,
	fetchResolutionTimeData,
	fetchSankeyData,
	fetchCorrelationMatrix,
	fetchSupportThreads,
} from '../supabase/queries-support'

interface SupportData {
	kpis: SupportKPIs | null
	statusDistribution: StatusDistribution[]
	resolutionTime: ResolutionTimeData[]
	sankeyData: SankeyData | null
	correlationMatrix: CorrelationCell[]
	threads: SupportThread[]
}

interface UseSupportDataReturn {
	data: SupportData
	isLoading: boolean
	error: Error | null
	refetch: () => Promise<void>
}

export function useSupportData(filters: SupportFilters): UseSupportDataReturn {
	const [data, setData] = useState<SupportData>({
		kpis: null,
		statusDistribution: [],
		resolutionTime: [],
		sankeyData: null,
		correlationMatrix: [],
		threads: [],
	})
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	// Fetch all data
	const fetchData = useCallback(async () => {
		setIsLoading(true)
		setError(null)

		try {
			// Fetch all data in parallel
			const [kpis, statusDist, resolutionTime, sankeyData, correlationMatrix, threads] =
				await Promise.all([
					fetchSupportKPIs(supabase, filters),
					fetchStatusDistribution(supabase, filters),
					fetchResolutionTimeData(supabase, filters),
					fetchSankeyData(supabase, filters),
					fetchCorrelationMatrix(supabase, filters),
					fetchSupportThreads(supabase, filters),
				])

			setData({
				kpis,
				statusDistribution: statusDist,
				resolutionTime,
				sankeyData,
				correlationMatrix,
				threads,
			})
		} catch (err) {
			console.error('Error fetching support data:', err)
			setError(err instanceof Error ? err : new Error('Unknown error'))
		} finally {
			setIsLoading(false)
		}
	}, [filters])

	// Fetch data when filters change
	useEffect(() => {
		fetchData()
	}, [fetchData])

	// Set up real-time subscription
	useEffect(() => {
		// Subscribe to support_threads_data changes
		const channel = supabase
			.channel('support-threads-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'support_threads_data',
				},
				() => {
					// Refetch data when table changes
					fetchData()
				}
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [fetchData])

	return {
		data,
		isLoading,
		error,
		refetch: fetchData,
	}
}
