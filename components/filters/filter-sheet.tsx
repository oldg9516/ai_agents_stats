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
import { useTranslations } from 'next-intl'

interface FilterSheetProps {
	/** Title shown in the sheet header */
	title: string
	/** Description shown in the sheet header */
	description: string
	/** Number of currently active filters (displayed as a badge) */
	activeFilterCount: number
	/** Filter content to display inside the sheet - can be ReactNode or render function */
	children: ReactNode | ((props: { close: () => void }) => ReactNode)
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
 * - Supports render props pattern for programmatic close
 *
 * Usage:
 * ```tsx
 * <FilterSheet
 *   title="Dashboard Filters"
 *   description="Customize your dashboard view..."
 *   activeFilterCount={3}
 * >
 *   {({ close }) => <YourFiltersContent onApply={close} />}
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
	const t = useTranslations()
	const [open, setOpen] = useState(false)

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		onOpenChange?.(newOpen)
	}

	const close = () => {
		setOpen(false)
		onOpenChange?.(false)
	}

	// Support both render props and regular children
	const content = typeof children === 'function' ? children({ close }) : children

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetTrigger asChild>
				<Button variant='outline' size='default' className='relative'>
					<IconAdjustments className='h-4 w-4 mr-2' />
					{t('filterSheet.filters')}
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
				<div className='mt-6'>{content}</div>
			</SheetContent>
		</Sheet>
	)
}
