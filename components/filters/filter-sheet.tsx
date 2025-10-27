'use client'

import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import { QUALIFIED_AGENTS } from '@/constants/qualified-agents'
import type { DashboardFilters } from '@/lib/supabase/types'
import { IconAdjustments, IconFilterCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { FilterBar } from './filter-bar'

interface FilterSheetProps {
	filters: DashboardFilters
	onFiltersChange: (filters: Partial<DashboardFilters>) => void
	onReset: () => void
	availableVersions: string[]
	availableCategories: string[]
}

/**
 * Filter Sheet - Collapsible side panel for dashboard filters
 *
 * Features:
 * - Opens filters in a side sheet to save space
 * - Shows active filter count badge
 * - Mobile-friendly drawer behavior
 */
export function FilterSheet({
	filters,
	onFiltersChange,
	onReset,
	availableVersions,
	availableCategories,
}: FilterSheetProps) {
	const [open, setOpen] = useState(false)

	// Count active filters
	const getActiveFilterCount = () => {
		let count = 0

		// Check if date range is not default (last 30 days)
		const defaultFrom = new Date()
		defaultFrom.setDate(defaultFrom.getDate() - 30)
		const isDefaultDateRange =
			Math.abs(filters.dateRange.from.getTime() - defaultFrom.getTime()) <
			86400000 // 1 day tolerance

		if (!isDefaultDateRange) count++

		// Check if versions are filtered
		if (
			filters.versions.length > 0 &&
			filters.versions.length < availableVersions.length
		) {
			count++
		}

		// Check if categories are filtered
		if (
			filters.categories.length > 0 &&
			filters.categories.length < availableCategories.length
		) {
			count++
		}

		// Check if agents are filtered
		if (
			filters.agents.length > 0 &&
			filters.agents.length < QUALIFIED_AGENTS.length
		) {
			count++
		}

		return count
	}

	const activeFilterCount = getActiveFilterCount()

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant='outline' size='default' className='relative'>
					<IconAdjustments className='h-4 w-4 mr-2' />
					Filters
					{activeFilterCount > 0 && (
						<span className='ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground'>
							{activeFilterCount}
						</span>
					)}
				</Button>
			</SheetTrigger>
			<SheetContent side='left' className='w-full sm:max-w-lg overflow-y-auto'>
				<SheetHeader>
					<SheetTitle className='flex items-center gap-2'>
						<IconFilterCheck className='h-5 w-5' />
						Dashboard Filters
					</SheetTitle>
					<SheetDescription>
						Customize your dashboard view by filtering data across date ranges,
						versions, categories, and qualified agents.
					</SheetDescription>
				</SheetHeader>
				<div className='mt-6'>
					<FilterBar
						filters={filters}
						onFiltersChange={onFiltersChange}
						onReset={() => {
							onReset()
							setOpen(false)
						}}
						availableVersions={availableVersions}
						availableCategories={availableCategories}
					/>
				</div>
			</SheetContent>
		</Sheet>
	)
}
