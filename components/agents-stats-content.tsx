'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { IconAlertCircle } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useAgentsStatsFilters } from '@/lib/store/hooks'
import { useAgentStats } from '@/lib/queries/agents-stats-queries'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import { AgentsStatsSkeleton } from './loading/agents-stats-skeleton'
import { AgentsStatsFilterBar } from './filters/agents-stats-filter-bar'
import { AgentsStatsTable } from './tables/agents-stats-table'
import { AgentChangesModal } from './agent-changes-modal'
import { FilterSheet } from './filters/filter-sheet'
import { DateRangeFilter } from './filters/date-range-filter'
import type { AgentChangeType } from '@/lib/supabase/types'

/**
 * Agents Stats Content - Client Component
 *
 * Main content component for /agents-stats page
 * Shows table of agents with AI efficiency metrics
 *
 * Features:
 * - Filters (date range, versions, categories)
 * - Agent statistics table
 * - Click on agent to view their changes in modal
 * - Total row
 */
export function AgentsStatsContent() {
	const t = useTranslations()

	// Get filter state from Zustand
	const {
		filters,
		setDateRange,
		setVersions,
		setCategories,
		resetFilters,
		openAgentChangesModal,
	} = useAgentsStatsFilters()

	// Handle filter apply from sheet (deferred application)
	const handleApplyFilters = (updates: { versions: string[]; categories: string[] }) => {
		setVersions(updates.versions)
		setCategories(updates.categories)
	}

	// Fetch filter options based on current date range
	const { data: filterOptions } = useQuery({
		queryKey: [
			'filterOptions',
			filters.dateRange.from.toISOString(),
			filters.dateRange.to.toISOString(),
		],
		queryFn: () => fetchFilterOptions(filters.dateRange),
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	})

	// Fetch agent stats
	const { data: agentStats, totals, isLoading, error } = useAgentStats(filters)

	// Handle agent click - open modal
	const handleAgentClick = useCallback(
		(email: string, changeType: AgentChangeType) => {
			openAgentChangesModal(email, changeType)
		},
		[openAgentChangesModal]
	)

	// Count active filters
	const getActiveFilterCount = () => {
		let count = 0
		if (filters.versions?.length > 0) count++
		if (filters.categories?.length > 0) count++
		return count
	}

	// Show loading state
	if (isLoading) {
		return <AgentsStatsSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<div className='flex flex-col items-center justify-center min-h-[400px] gap-4 px-4'>
				<IconAlertCircle className='h-12 w-12 text-destructive' />
				<div className='text-destructive text-lg font-semibold'>
					{t('errors.loadingTable')}
				</div>
				<p className='text-muted-foreground text-center max-w-md'>
					{error.message}
				</p>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Modal */}
			<AgentChangesModal />

			{/* Filters Section */}
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
				{/* More Filters Button */}
				<div className='lg:order-1'>
					<FilterSheet
						title={t('agentsStats.filters.title')}
						description={t('agentsStats.filters.description')}
						activeFilterCount={getActiveFilterCount()}
					>
						{({ close }) => (
							<AgentsStatsFilterBar
								filters={filters}
								onApplyFilters={handleApplyFilters}
								onReset={resetFilters}
								availableVersions={filterOptions?.versions ?? []}
								availableCategories={filterOptions?.categories ?? []}
								onClose={close}
							/>
						)}
					</FilterSheet>
				</div>

				{/* Date Range Selector */}
				<div className='lg:order-2 lg:flex-1'>
					<DateRangeFilter
						from={filters.dateRange.from}
						to={filters.dateRange.to}
						onChange={setDateRange}
					/>
				</div>
			</div>

			{/* Table */}
			<AgentsStatsTable
				data={agentStats}
				totals={totals}
				onAgentClick={handleAgentClick}
			/>
		</div>
	)
}
