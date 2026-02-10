'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { useAgentsStatsFilters } from '@/lib/store/hooks'
import { useAgentStats } from '@/lib/queries/agents-stats-queries'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'
import { getActiveFilterCount } from '@/lib/utils/filter-utils'
import { AgentsStatsSkeleton } from './loading/agents-stats-skeleton'
import { AgentsStatsFilterBar } from './filters/agents-stats-filter-bar'
import { AgentsStatsTable } from './tables/agents-stats-table'
import { AgentChangesModal } from './agent-changes-modal'
import { FilterSheet } from './filters/filter-sheet'
import { DateRangeFilter } from './filters/date-range-filter'
import { AnalyticsPageLayout } from './layouts/analytics-page-layout'
import { PageErrorState } from './shared/page-error-state'
import type { AgentChangeType } from '@/lib/supabase/types'

export function AgentsStatsContent() {
	const t = useTranslations()

	const {
		filters,
		setDateRange,
		setVersions,
		setCategories,
		resetFilters,
		openAgentChangesModal,
	} = useAgentsStatsFilters()

	const handleApplyFilters = (updates: { versions: string[]; categories: string[] }) => {
		setVersions(updates.versions)
		setCategories(updates.categories)
	}

	const { data: filterOptions } = useQuery({
		queryKey: [
			'filterOptions',
			filters.dateRange.from.toISOString(),
			filters.dateRange.to.toISOString(),
		],
		queryFn: () => fetchFilterOptions(filters.dateRange),
		staleTime: 5 * 60 * 1000,
	})

	const { data: agentStats, totals, isLoading, error } = useAgentStats(filters)

	const handleAgentClick = useCallback(
		(email: string, changeType: AgentChangeType) => {
			openAgentChangesModal(email, changeType)
		},
		[openAgentChangesModal]
	)

	if (isLoading) {
		return <AgentsStatsSkeleton />
	}

	if (error) {
		return <PageErrorState messageKey='errors.loadingTable' error={error} />
	}

	return (
		<AnalyticsPageLayout
			filterSheet={
				<FilterSheet
					title={t('agentsStats.filters.title')}
					description={t('agentsStats.filters.description')}
					activeFilterCount={getActiveFilterCount(filters)}
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
			}
			dateRange={
				<DateRangeFilter
					from={filters.dateRange.from}
					to={filters.dateRange.to}
					onChange={setDateRange}
				/>
			}
		>
			<AgentChangesModal />
			<AgentsStatsTable
				data={agentStats}
				totals={totals}
				onAgentClick={handleAgentClick}
			/>
		</AnalyticsPageLayout>
	)
}
