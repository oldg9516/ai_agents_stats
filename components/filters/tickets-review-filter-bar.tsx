'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { TicketsReviewFilters } from '@/lib/supabase/types'
import { fetchTicketsReviewFilterOptionsAction } from '@/lib/actions/tickets-review-actions'
import { useLocalFilterState } from '@/lib/hooks/use-local-filter-state'
import { CLASSIFICATION_TYPES } from '@/constants/classification-types'
import { REVIEWER_AGENTS } from '@/constants/qualified-agents'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FilterBarLayout } from './filter-bar-layout'
import { MultiSelectFilter } from './multi-select-filter'

interface TicketsReviewFilterBarProps {
	filters: TicketsReviewFilters
	onApplyFilters: (filters: {
		ticketId: number | null
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

export function TicketsReviewFilterBar({
	filters,
	onApplyFilters,
	onReset,
	onClose,
}: TicketsReviewFilterBarProps) {
	const t = useTranslations()

	// Available filter options (fetched async)
	const [availableCategories, setAvailableCategories] = useState<string[]>([])
	const [availableVersions, setAvailableVersions] = useState<string[]>([])
	const [availableClassifications, setAvailableClassifications] = useState<string[]>([])
	const [availableAgents, setAvailableAgents] = useState<string[]>([])

	const { values, setValue, handleApply, handleReset } = useLocalFilterState(
		{
			ticketId: filters.ticketId ?? null as number | null,
			categories: filters.categories ?? [],
			versions: filters.versions ?? [],
			classifications: filters.classifications ?? [],
			agents: filters.agents ?? [],
			reviewStatuses: filters.reviewStatuses ?? [],
			reviewerNames: filters.reviewerNames ?? [],
		},
		{ onApply: onApplyFilters, onReset, onClose }
	)

	// Fetch filter options on mount and when date range changes
	useEffect(() => {
		const fetchOptions = async () => {
			const result = await fetchTicketsReviewFilterOptionsAction(filters.dateRange)
			if (result.success && result.data) {
				setAvailableCategories(result.data.categories)
				setAvailableVersions(result.data.versions)
				setAvailableClassifications(result.data.classifications)
				setAvailableAgents(result.data.agents)
			}
		}
		fetchOptions()
	}, [filters.dateRange])

	return (
		<FilterBarLayout.Root>
			<FilterBarLayout.Fields>
				<div className='space-y-2'>
					<Label className='text-sm font-medium'>{t('ticketsReview.filters.ticketId')}</Label>
					<Input
						type='number'
						placeholder={t('ticketsReview.filters.ticketIdPlaceholder')}
						value={values.ticketId ?? ''}
						onChange={e => {
							const val = e.target.value.trim()
							setValue('ticketId', val ? parseInt(val, 10) : null)
						}}
					/>
				</div>
				<MultiSelectFilter
					label={t('ticketsReview.filters.category')}
					options={availableCategories}
					selected={values.categories}
					onChange={v => setValue('categories', v)}
					placeholder={t('ticketsReview.filters.searchCategories')}
				/>
				<MultiSelectFilter
					label={t('ticketsReview.filters.version')}
					options={availableVersions}
					selected={values.versions}
					onChange={v => setValue('versions', v)}
					placeholder={t('ticketsReview.filters.searchVersions')}
				/>
				<MultiSelectFilter
					label={t('ticketsReview.filters.classification')}
					options={availableClassifications.filter(c => CLASSIFICATION_TYPES.includes(c as any))}
					selected={values.classifications}
					onChange={v => setValue('classifications', v)}
					placeholder={t('ticketsReview.filters.searchClassifications')}
					formatLabel={(classification: string) =>
						t(`ticketsReview.classifications.${classification}` as any)
					}
				/>
				<MultiSelectFilter
					label={t('ticketsReview.filters.agent')}
					options={availableAgents}
					selected={values.agents}
					onChange={v => setValue('agents', v)}
					placeholder={t('ticketsReview.filters.searchAgents')}
				/>
				<MultiSelectFilter
					label={t('ticketsReview.filters.status')}
					options={['processed', 'unprocessed']}
					selected={values.reviewStatuses}
					onChange={v => setValue('reviewStatuses', v)}
					placeholder={t('ticketsReview.filters.searchStatuses')}
					formatLabel={(status: string) =>
						status === 'processed'
							? t('ticketsReview.statuses.processed')
							: t('ticketsReview.statuses.unprocessed')
					}
				/>
				<MultiSelectFilter
					label={t('ticketsReview.filters.reviewer')}
					options={REVIEWER_AGENTS.map(r => r.name)}
					selected={values.reviewerNames}
					onChange={v => setValue('reviewerNames', v)}
					placeholder={t('ticketsReview.filters.searchReviewers')}
				/>
			</FilterBarLayout.Fields>
			<FilterBarLayout.Actions
				onApply={handleApply}
				onReset={handleReset}
				resetLabel={t('ticketsReview.filters.reset')}
			/>
		</FilterBarLayout.Root>
	)
}
