'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { IconRefresh, IconCheck } from '@tabler/icons-react'
import type { TicketsReviewFilters } from '@/lib/supabase/types'
import { fetchTicketsReviewFilterOptionsAction } from '@/lib/actions/tickets-review-actions'
import { MultiSelectFilter } from './multi-select-filter'
import { CLASSIFICATION_TYPES } from '@/constants/classification-types'
import { REVIEWER_AGENTS } from '@/constants/qualified-agents'

interface TicketsReviewFilterBarProps {
	filters: TicketsReviewFilters
	onApplyFilters: (filters: {
		categories: string[]
		versions: string[]
		classifications: string[]
		agents: string[]
		reviewStatuses: string[]
		reviewerNames: string[]
	}) => void
	onReset: () => void
	onClose?: () => void
}

/**
 * Filter Bar for Tickets Review
 * Contains category, version, classification, and agent filters
 * Uses local state with Apply button for deferred filter application
 */
export function TicketsReviewFilterBar({
	filters,
	onApplyFilters,
	onReset,
	onClose,
}: TicketsReviewFilterBarProps) {
	const t = useTranslations()

	// Available filter options
	const [availableCategories, setAvailableCategories] = useState<string[]>([])
	const [availableVersions, setAvailableVersions] = useState<string[]>([])
	const [availableClassifications, setAvailableClassifications] = useState<
		string[]
	>([])
	const [availableAgents, setAvailableAgents] = useState<string[]>([])

	// Local state for pending filter changes
	const [localCategories, setLocalCategories] = useState<string[]>(filters.categories ?? [])
	const [localVersions, setLocalVersions] = useState<string[]>(filters.versions ?? [])
	const [localClassifications, setLocalClassifications] = useState<string[]>(filters.classifications ?? [])
	const [localAgents, setLocalAgents] = useState<string[]>(filters.agents ?? [])
	const [localReviewStatuses, setLocalReviewStatuses] = useState<string[]>(filters.reviewStatuses ?? [])
	const [localReviewerNames, setLocalReviewerNames] = useState<string[]>(filters.reviewerNames ?? [])

	// Sync local state when filters prop changes (e.g., after reset)
	const filtersKey = JSON.stringify({
		categories: filters.categories,
		versions: filters.versions,
		classifications: filters.classifications,
		agents: filters.agents,
		reviewStatuses: filters.reviewStatuses,
		reviewerNames: filters.reviewerNames,
	})

	useEffect(() => {
		setLocalCategories(filters.categories ?? [])
		setLocalVersions(filters.versions ?? [])
		setLocalClassifications(filters.classifications ?? [])
		setLocalAgents(filters.agents ?? [])
		setLocalReviewStatuses(filters.reviewStatuses ?? [])
		setLocalReviewerNames(filters.reviewerNames ?? [])
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filtersKey])

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

	// Apply filters and close sheet
	const handleApply = () => {
		onApplyFilters({
			categories: localCategories,
			versions: localVersions,
			classifications: localClassifications,
			agents: localAgents,
			reviewStatuses: localReviewStatuses,
			reviewerNames: localReviewerNames,
		})
		onClose?.()
	}

	// Reset and sync local state
	const handleReset = () => {
		onReset()
		// Local state will be synced via useEffect when filters prop changes
	}

	return (
		<div className='space-y-6'>
			{/* Category Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.category')}
				options={availableCategories}
				selected={localCategories}
				onChange={setLocalCategories}
				placeholder={t('ticketsReview.filters.searchCategories')}
			/>

			{/* Version Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.version')}
				options={availableVersions}
				selected={localVersions}
				onChange={setLocalVersions}
				placeholder={t('ticketsReview.filters.searchVersions')}
			/>

			{/* Classification Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.classification')}
				options={availableClassifications.filter(c => CLASSIFICATION_TYPES.includes(c as any))}
				selected={localClassifications}
				onChange={setLocalClassifications}
				placeholder={t('ticketsReview.filters.searchClassifications')}
				formatLabel={(classification: string) =>
					t(`ticketsReview.classifications.${classification}` as any)
				}
			/>

			{/* Agent Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.agent')}
				options={availableAgents}
				selected={localAgents}
				onChange={setLocalAgents}
				placeholder={t('ticketsReview.filters.searchAgents')}
			/>

			{/* Status Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.status')}
				options={['processed', 'unprocessed']}
				selected={localReviewStatuses}
				onChange={setLocalReviewStatuses}
				placeholder={t('ticketsReview.filters.searchStatuses')}
				formatLabel={(status: string) =>
					status === 'processed'
						? t('ticketsReview.statuses.processed')
						: t('ticketsReview.statuses.unprocessed')
				}
			/>

			{/* Reviewer Filter */}
			<MultiSelectFilter
				label={t('ticketsReview.filters.reviewer')}
				options={REVIEWER_AGENTS.map(r => r.id)}
				selected={localReviewerNames}
				onChange={setLocalReviewerNames}
				placeholder={t('ticketsReview.filters.searchReviewers')}
				formatLabel={(reviewerId: string) => {
					const reviewer = REVIEWER_AGENTS.find(r => r.id === reviewerId)
					return reviewer?.name || reviewerId
				}}
			/>

			{/* Action Buttons */}
			<div className='flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t'>
				<Button onClick={handleReset} variant='outline' size='sm' className='w-full sm:w-auto'>
					<IconRefresh className='mr-2 h-4 w-4' />
					{t('ticketsReview.filters.reset')}
				</Button>
				<Button onClick={handleApply} variant='default' size='sm' className='w-full sm:w-auto'>
					<IconCheck className='mr-2 h-4 w-4' />
					{t('filters.apply')}
				</Button>
			</div>
		</div>
	)
}
