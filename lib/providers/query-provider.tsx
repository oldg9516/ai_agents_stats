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
						// Global defaults for all queries
						staleTime: 60 * 1000, // Data is fresh for 1 minute
						gcTime: 5 * 60 * 1000, // Cache unused data for 5 minutes (formerly cacheTime)
						refetchOnWindowFocus: true, // Refetch when window regains focus
						refetchOnReconnect: true, // Refetch when reconnecting
						retry: 1, // Retry failed requests once
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
