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
import type { SupportFilters } from '@/lib/supabase/types'
import { IconAdjustments, IconFilterCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { SupportFilterBar } from './support-filter-bar'

interface SupportFilterSheetProps {
	filters: SupportFilters
	onDateRangeChange: (from: Date, to: Date) => void
	onStatusesChange: (statuses: string[]) => void
	onRequestTypesChange: (types: string[]) => void
	onRequirementsChange: (requirements: string[]) => void
	onVersionsChange: (versions: string[]) => void
	onReset: () => void
	availableVersions: string[]
}

/**
 * Support Filter Sheet - Collapsible side panel for support overview filters
 *
 * Features:
 * - Opens filters in a side sheet to save space
 * - Shows active filter count badge
 * - Mobile-friendly drawer behavior
 */
export function SupportFilterSheet({
	filters,
	onDateRangeChange,
	onStatusesChange,
	onRequestTypesChange,
	onRequirementsChange,
	onVersionsChange,
	onReset,
	availableVersions,
}: SupportFilterSheetProps) {
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

		// Check if statuses are filtered
		if (filters.statuses.length > 0) count++

		// Check if request types are filtered
		if (filters.requestTypes.length > 0) count++

		// Check if requirements are filtered
		if (filters.requirements.length > 0) count++

		// Check if versions are filtered
		if (
			filters.versions.length > 0 &&
			filters.versions.length < availableVersions.length
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
			<SheetContent
				side='left'
				className='w-full sm:max-w-lg overflow-y-auto px-4'
			>
				<SheetHeader>
					<SheetTitle className='flex items-center gap-2'>
						<IconFilterCheck className='h-5 w-5' />
						Support Filters
					</SheetTitle>
					<SheetDescription>
						Filter support threads by date range, status, request type,
						requirements, and prompt version.
					</SheetDescription>
				</SheetHeader>
				<div className='mt-6'>
					<SupportFilterBar
						filters={filters}
						onDateRangeChange={onDateRangeChange}
						onStatusesChange={onStatusesChange}
						onRequestTypesChange={onRequestTypesChange}
						onRequirementsChange={onRequirementsChange}
						onVersionsChange={onVersionsChange}
						onReset={() => {
							onReset()
							setOpen(false)
						}}
						availableVersions={availableVersions}
					/>
				</div>
			</SheetContent>
		</Sheet>
	)
}
