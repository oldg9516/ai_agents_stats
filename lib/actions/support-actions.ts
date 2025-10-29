'use server'

/**
 * Support Overview Server Actions
 *
 * Server-side functions using SERVICE ROLE key to bypass RLS
 * This is necessary because support_threads_data has RLS enabled
 */

import {
	fetchCorrelationMatrix,
	fetchResolutionTimeData,
	fetchSankeyData,
	fetchStatusDistribution,
	fetchSupportKPIs,
	fetchSupportThreads,
} from '@/lib/supabase/queries-support'
import { supabaseServer } from '@/lib/supabase/server'
import type { SupportFilters } from '@/lib/supabase/types'

/**
 * Fetch all support overview data in one Server Action
 * Returns all KPIs, charts, and table data
 */
export async function fetchSupportData(filters: SupportFilters) {
	try {
		// Fetch all data in parallel for best performance
		// Using supabaseServer with SERVICE ROLE key to bypass RLS
		const serverClient = supabaseServer
		const [
			kpis,
			statusDist,
			resolutionTime,
			sankeyData,
			correlationMatrix,
			threads,
		] = await Promise.all([
			fetchSupportKPIs(serverClient, filters),
			fetchStatusDistribution(serverClient, filters),
			fetchResolutionTimeData(serverClient, filters),
			fetchSankeyData(serverClient, filters),
			fetchCorrelationMatrix(serverClient, filters),
			fetchSupportThreads(serverClient, filters),
		])

		return {
			success: true,
			data: {
				kpis,
				statusDistribution: statusDist,
				resolutionTime,
				sankeyData,
				correlationMatrix,
				threads,
			},
		}
	} catch (error) {
		console.error('❌ [Server Action] Error fetching support data:', error)
		return {
			success: false,
			error:
				error instanceof Error ? error.message : 'Failed to fetch support data',
		}
	}
}
