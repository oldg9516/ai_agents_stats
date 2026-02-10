'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { IconCheck, IconRefresh } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

/**
 * Compound component for filter bar layout.
 * Follows Vercel Composition Patterns — composable parts instead of boolean props.
 *
 * Usage:
 * ```tsx
 * <FilterBarLayout.Root>
 *   <FilterBarLayout.Toggle ... />
 *   <FilterBarLayout.Fields>
 *     <MultiSelectFilter ... />
 *   </FilterBarLayout.Fields>
 *   <FilterBarLayout.Actions onApply={...} onReset={...} />
 * </FilterBarLayout.Root>
 * ```
 */

function Root({ children }: { children: ReactNode }) {
	return <div className='space-y-4'>{children}</div>
}

function Fields({ children }: { children: ReactNode }) {
	return <div className='grid gap-4 sm:gap-6 grid-cols-1'>{children}</div>
}

interface ToggleProps {
	id: string
	label: string
	description?: string
	checked: boolean
	onChange: (checked: boolean) => void
	color?: 'blue' | 'amber'
}

const TOGGLE_COLORS = {
	blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
	amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
} as const

function Toggle({ id, label, description, checked, onChange, color = 'blue' }: ToggleProps) {
	return (
		<div className={`flex items-center justify-between rounded-lg border p-3 ${TOGGLE_COLORS[color]}`}>
			<div className='space-y-0.5'>
				<Label htmlFor={id} className='text-sm font-medium cursor-pointer'>
					{label}
				</Label>
				{description && (
					<p className='text-xs text-muted-foreground'>{description}</p>
				)}
			</div>
			<Switch id={id} checked={checked} onCheckedChange={onChange} />
		</div>
	)
}

interface ActionsProps {
	onApply: () => void
	onReset: () => void
	resetLabel?: string
	applyLabel?: string
}

function Actions({ onApply, onReset, resetLabel, applyLabel }: ActionsProps) {
	const t = useTranslations('filters')

	return (
		<div className='flex flex-col sm:flex-row gap-2 sm:justify-end'>
			<Button onClick={onReset} variant='outline' size='sm' className='w-full sm:w-auto'>
				<IconRefresh className='mr-2 h-4 w-4' />
				{resetLabel ?? t('resetFilters')}
			</Button>
			<Button onClick={onApply} variant='default' size='sm' className='w-full sm:w-auto'>
				<IconCheck className='mr-2 h-4 w-4' />
				{applyLabel ?? t('apply')}
			</Button>
		</div>
	)
}

export const FilterBarLayout = {
	Root,
	Fields,
	Toggle,
	Actions,
}
