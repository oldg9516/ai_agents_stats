'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import type { TicketsReviewFilters } from '@/lib/supabase/types'
import { fetchTicketsReviewFilterOptionsAction } from '@/lib/actions/tickets-review-actions'
import { MultiSelectFilter } from './multi-select-filter'
import { CLASSIFICATION_TYPES } from '@/constants/classification-types'

interface TicketsReviewFilterBarProps {
	filters: TicketsReviewFilters
	onCategoriesChange: (categories: string[]) => void
	onVersionsChange: (versions: string[]) => void
	onClassificationsChange: (classifications: string[]) => void
	onAgentsChange: (agents: string[]) => void
	onStatusesChange: (statuses: string[]) => void
	onReset: () => void
}

/**
 * Filter Bar for Tickets Review
 * Contains category, version, classification, and agent filters
 */
export function TicketsReviewFilterBar({
	filters,
	onCategoriesChange,
	onVersionsChange,
	onClassificationsChange,
	onAgentsChange,
	onStatusesChange,
	onReset,
}: TicketsReviewFilterBarProps) {
	const t = useTranslations()

	// Available filter options
	const [availableCategories, setAvailableCategories] = useState<string[]>([])
	const [availableVersions, setAvailableVersions] = useState<string[]>([])
	const [availableClassifications, setAvailableClassifications] = useState<
		string[]
	>([])
	const [availableAgents, setAvailableAgents] = useState<string[]>([])

	// Fetch filter options on mount and when date range changes
	useEffect(() => {
		const fetchOptions = async () => {
			const result = await fetchTicketsReviewFilterOptionsAction(
				filters.dateRange
			)
			if (result.success && result.data) {
				setAvailableCategories(result.data.categories)
				setAvailableVersions(result.data.versions)
				setAvailableClassifications(result.data.classifications)
				setAvailableAgents(result.data.agents)
			}
		}
		fetchOptions()
	}, [filters.dateRange])

	// Classification labels (not currently used, but keeping for future)
	const getClassificationLabel = (classification: string) => {
		const key = `ticketsReview.classifications.${classification}` as
			| 'ticketsReview.classifications.critical_error'
			| 'ticketsReview.classifications.meaningful_improvement'
			| 'ticketsReview.classifications.stylistic_preference'
			| 'ticketsReview.classifications.no_significant_change'
			| 'ticketsReview.classifications.context_shift'
		return t(key)
	}

	return (
		<div className='space-y-6'>
			{/* Category Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.category')}
				options={availableCategories}
				selected={filters.categories}
				onChange={onCategoriesChange}
				placeholder={t('ticketsReview.filters.searchCategories')}
			/>

			{/* Version Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.version')}
				options={availableVersions}
				selected={filters.versions}
				onChange={onVersionsChange}
				placeholder={t('ticketsReview.filters.searchVersions')}
			/>

			{/* Classification Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.classification')}
				options={availableClassifications.filter(c => CLASSIFICATION_TYPES.includes(c as any))}
				selected={filters.classifications}
				onChange={onClassificationsChange}
				placeholder={t('ticketsReview.filters.searchClassifications')}
				formatLabel={(classification: string) =>
					t(`ticketsReview.classifications.${classification}` as any)
				}
			/>

			{/* Agent Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.agent')}
				options={availableAgents}
				selected={filters.agents}
				onChange={onAgentsChange}
				placeholder={t('ticketsReview.filters.searchAgents')}
			/>

			{/* Status Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.status')}
				options={['processed', 'unprocessed']}
				selected={filters.reviewStatuses}
				onChange={onStatusesChange}
				placeholder={t('ticketsReview.filters.searchStatuses')}
				formatLabel={(status: string) =>
					status === 'processed'
						? t('ticketsReview.statuses.processed')
						: t('ticketsReview.statuses.unprocessed')
				}
			/>

			{/* Reset Button */}
			<div className='pt-4 border-t'>
				<Button onClick={onReset} variant='outline' className='w-full'>
					<IconRefresh className='mr-2 h-4 w-4' />
					{t('ticketsReview.filters.reset')}
				</Button>
			</div>
		</div>
	)
}
