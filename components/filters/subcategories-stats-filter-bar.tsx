'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconRefresh, IconCheck } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { MultiSelectFilter } from './multi-select-filter'

interface SubcategoriesStatsFilterBarProps {
	versions: string[]
	agents: string[]
	onApplyFilters: (filters: { versions: string[]; agents: string[] }) => void
	onReset: () => void
	availableVersions: string[]
	availableAgents: string[]
	onClose?: () => void
}

/**
 * Subcategories Stats Filter Bar (inside FilterSheet)
 *
 * Features:
 * - Version multi-select
 * - Agent multi-select
 * - Apply button (deferred filter application)
 * - Reset button
 */
export function SubcategoriesStatsFilterBar({
	versions,
	agents,
	onApplyFilters,
	onReset,
	availableVersions,
	availableAgents,
	onClose,
}: SubcategoriesStatsFilterBarProps) {
	const t = useTranslations('filters')

	// Local state for pending filter changes
	const [localVersions, setLocalVersions] = useState<string[]>(versions ?? [])
	const [localAgents, setLocalAgents] = useState<string[]>(agents ?? [])

	// Sync local state when filters prop changes (e.g., after reset)
	const filtersKey = JSON.stringify({
		versions,
		agents,
	})

	useEffect(() => {
		setLocalVersions(versions ?? [])
		setLocalAgents(agents ?? [])
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filtersKey])

	// Apply filters and close sheet
	const handleApply = () => {
		onApplyFilters({
			versions: localVersions,
			agents: localAgents,
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
			{/* Version Filter */}
			<MultiSelectFilter
				label={t('versions')}
				options={availableVersions}
				selected={localVersions}
				onChange={setLocalVersions}
				placeholder={t('searchVersions')}
			/>

			{/* Agent Filter */}
			<MultiSelectFilter
				label={t('agents')}
				options={availableAgents}
				selected={localAgents}
				onChange={setLocalAgents}
				placeholder={t('searchAgents')}
			/>

			{/* Action Buttons */}
			<div className='flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t'>
				<Button onClick={handleReset} variant='outline' size='sm' className='w-full sm:w-auto'>
					<IconRefresh className='mr-2 h-4 w-4' />
					{t('resetFilters')}
				</Button>
				<Button onClick={handleApply} variant='default' size='sm' className='w-full sm:w-auto'>
					<IconCheck className='mr-2 h-4 w-4' />
					{t('apply')}
				</Button>
			</div>
		</div>
	)
}
