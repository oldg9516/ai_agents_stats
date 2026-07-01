'use client'

/**
 * React Query hooks for the Support Agents CRUD page.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	createSupportAgent,
	deleteSupportAgent,
	fetchSupportAgents,
	toggleSupportAgentEnabled,
	updateSupportAgent,
} from '@/lib/actions/support-agents-actions'
import { QUERY_CACHE_CONFIG } from '@/lib/queries/query-config'
import { supportAgentsKeys } from '@/lib/queries/query-keys'
import type {
	CreateSupportAgentInput,
	SupportAgent,
	UpdateSupportAgentInput,
} from '@/lib/db/types'

export function useSupportAgents() {
	const query = useQuery({
		queryKey: supportAgentsKeys.list(),
		queryFn: async (): Promise<SupportAgent[]> => {
			const result = await fetchSupportAgents()
			if (!result.success || !result.data) {
				throw new Error(result.error || 'Failed to fetch support agents')
			}
			return result.data
		},
		...QUERY_CACHE_CONFIG,
		staleTime: 60 * 1000, // 1 min — edits should show up quickly
	})

	return {
		agents: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	}
}

export function useCreateSupportAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (input: CreateSupportAgentInput) => {
			const result = await createSupportAgent(input)
			if (!result.success) throw new Error(result.error || 'Failed to create agent')
			return result.data
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAgentsKeys.all }),
	})
}

export function useUpdateSupportAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, input }: { id: number; input: UpdateSupportAgentInput }) => {
			const result = await updateSupportAgent(id, input)
			if (!result.success) throw new Error(result.error || 'Failed to update agent')
			return result.data
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAgentsKeys.all }),
	})
}

export function useToggleSupportAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
			const result = await toggleSupportAgentEnabled(id, enabled)
			if (!result.success) throw new Error(result.error || 'Failed to toggle agent')
			return result.data
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAgentsKeys.all }),
	})
}

export function useDeleteSupportAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: number) => {
			const result = await deleteSupportAgent(id)
			if (!result.success) throw new Error(result.error || 'Failed to delete agent')
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAgentsKeys.all }),
	})
}
