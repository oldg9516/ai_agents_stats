'use client'

/**
 * TanStack Query Provider
 *
 * Wraps the application with QueryClientProvider for data fetching,
 * caching, and synchronization.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { QUERY_CACHE_CONFIG } from '@/lib/queries/query-config'

interface QueryProviderProps {
	children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
	// Create QueryClient instance inside component to avoid sharing between requests
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Global defaults - use centralized config
						...QUERY_CACHE_CONFIG,
						refetchOnReconnect: true, // Refetch when reconnecting
					},
					mutations: {
						// Global defaults for all mutations
						retry: 0, // Don't retry mutations
					},
				},
			})
	)

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{/* React Query Devtools - only in development */}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	)
}
