import { useStore } from '..'

/**
 * Hook for accessing tickets review filters state
 */
export function useTicketsReviewFilters() {
	const filters = useStore(state => state.ticketsReviewFilters)
	const setDateRange = useStore(state => state.setTicketsReviewDateRange)
	const setCategories = useStore(state => state.setTicketsReviewCategories)
	const setVersions = useStore(state => state.setTicketsReviewVersions)
	const setClassifications = useStore(
		state => state.setTicketsReviewClassifications
	)
	const setAgents = useStore(state => state.setTicketsReviewAgents)
	const setStatuses = useStore(state => state.setTicketsReviewStatuses)
	const resetFilters = useStore(state => state.resetTicketsReviewFilters)
	const updateFilters = useStore(state => state.updateTicketsReviewFilters)

	return {
		filters,
		setDateRange,
		setCategories,
		setVersions,
		setClassifications,
		setAgents,
		setStatuses,
		resetFilters,
		updateFilters,
	}
}
