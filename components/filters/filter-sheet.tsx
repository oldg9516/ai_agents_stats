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
import { IconAdjustments, IconFilterCheck } from '@tabler/icons-react'
import { type ReactNode, useState } from 'react'

interface FilterSheetProps {
	/** Title shown in the sheet header */
	title: string
	/** Description shown in the sheet header */
	description: string
	/** Number of currently active filters (displayed as a badge) */
	activeFilterCount: number
	/** Filter content to display inside the sheet */
	children: ReactNode
	/** Callback when sheet open state changes */
	onOpenChange?: (open: boolean) => void
}

/**
 * Universal Filter Sheet - Collapsible side panel for filters
 *
 * Features:
 * - Opens filters in a side sheet to save space
 * - Shows active filter count badge
 * - Mobile-friendly drawer behavior
 * - Reusable across all dashboard pages
 *
 * Usage:
 * ```tsx
 * <FilterSheet
 *   title="Dashboard Filters"
 *   description="Customize your dashboard view..."
 *   activeFilterCount={3}
 * >
 *   <YourFiltersContent />
 * </FilterSheet>
 * ```
 */
export function FilterSheet({
	title,
	description,
	activeFilterCount,
	children,
	onOpenChange,
}: FilterSheetProps) {
	const [open, setOpen] = useState(false)

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		onOpenChange?.(newOpen)
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
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
			<SheetContent side='left' className='w-full sm:max-w-lg overflow-y-auto px-4'>
				<SheetHeader>
					<SheetTitle className='flex items-center gap-2'>
						<IconFilterCheck className='h-5 w-5' />
						{title}
					</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				<div className='mt-6'>{children}</div>
			</SheetContent>
		</Sheet>
	)
}
