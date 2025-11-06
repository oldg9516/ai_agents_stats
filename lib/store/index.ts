/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createDashboardSlice, DashboardSlice } from './slices/dashboard-slice'
import { createSupportSlice, SupportSlice } from './slices/support-slice'

/**
 * Global store combining all slices
 */
type StoreState = DashboardSlice & SupportSlice

// Clean up invalid localStorage data on startup
if (typeof window !== 'undefined') {
	const stored = localStorage.getItem('ai-stats-storage')
	if (stored) {
		try {
			const parsed = JSON.parse(stored)
			// Check if version exists, if not - clear old data
			if (!parsed.version || parsed.version < 4) {
				localStorage.removeItem('ai-stats-storage')
			}
		} catch (e) {
			// Invalid JSON, clear it
			localStorage.removeItem('ai-stats-storage')
		}
	}
}

export const useStore = create<StoreState>()(
	devtools(
		persist(
			(...a) => ({
				...createDashboardSlice(...a),
				...createSupportSlice(...a),
			}),
			{
				name: 'ai-stats-storage',
				version: 4, // Changed from 3 to 4 to fix date calculation bug
				partialize: state => ({
					// Persist only filter states
					dashboardFilters: state.dashboardFilters,
					supportFilters: state.supportFilters,
				}),
				// Migration function for version changes
				migrate: (persistedState: any, version: number) => {
					// Force reset on version change
					if (version !== 4) {
						return null
					}

					// Validate dates even in persisted state
					if (persistedState?.dashboardFilters?.dateRange) {
						const from = new Date(
							persistedState.dashboardFilters.dateRange.from
						)
						const now = new Date()
						if (from > now) {
							return null
						}
					}

					if (persistedState?.supportFilters?.dateRange) {
						const from = new Date(persistedState.supportFilters.dateRange.from)
						const now = new Date()
						if (from > now) {
							return null
						}
					}

					return persistedState
				},
				// Convert date strings back to Date objects after rehydration
				onRehydrateStorage: () => state => {
					if (!state) {
						return
					}

					// Validate and fix dashboard dates
					if (state.dashboardFilters?.dateRange) {
						const from = new Date(state.dashboardFilters.dateRange.from)
						const to = new Date(state.dashboardFilters.dateRange.to)

						// Check if dates are valid and not in future
						const now = new Date()
						if (
							isNaN(from.getTime()) ||
							isNaN(to.getTime()) ||
							from > now ||
							to > now
						) {
							// Reset to default (last 30 days)
							const defaultTo = new Date()
							defaultTo.setHours(23, 59, 59, 999)
							const defaultFrom = new Date()
							defaultFrom.setDate(defaultFrom.getDate() - 30)
							defaultFrom.setHours(0, 0, 0, 0)
							state.dashboardFilters.dateRange = {
								from: defaultFrom,
								to: defaultTo,
							}
						} else {
							state.dashboardFilters.dateRange.from = from
							state.dashboardFilters.dateRange.to = to
						}
					}

					// Validate and fix support dates
					if (state.supportFilters?.dateRange) {
						const from = new Date(state.supportFilters.dateRange.from)
						const to = new Date(state.supportFilters.dateRange.to)

						// Check if dates are valid and not in future
						const now = new Date()
						if (
							isNaN(from.getTime()) ||
							isNaN(to.getTime()) ||
							from > now ||
							to > now
						) {
							// Reset to default (last 30 days)
							const defaultTo = new Date()
							defaultTo.setHours(23, 59, 59, 999)
							const defaultFrom = new Date()
							defaultFrom.setDate(defaultFrom.getDate() - 30)
							defaultFrom.setHours(0, 0, 0, 0)
							state.supportFilters.dateRange = {
								from: defaultFrom,
								to: defaultTo,
							}
						} else {
							state.supportFilters.dateRange.from = from
							state.supportFilters.dateRange.to = to
						}
					}
				},
			}
		),
		{
			name: 'AI Stats Store',
		}
	)
)
