'use client'

/**
 * Category Display Mode Toggle Component
 *
 * Allows switching between:
 * - "All": Show all categories as-is (including multi-categories with commas)
 * - "Merged": Merge categories with commas into single "Multi-category" group
 */

import { Switch } from '@/components/ui/switch'
import { useDashboardFilters } from '@/lib/store/hooks/use-dashboard-filters'
import { useTranslations } from 'next-intl'

export function CategoryDisplayToggle() {
	const { categoryDisplayMode, setCategoryDisplayMode } = useDashboardFilters()
	const t = useTranslations('dashboard.categoryMode')

	const isMerged = categoryDisplayMode === 'merged'

	return (
		<div className='flex items-center gap-3'>
			<span
				className={`text-sm transition-colors ${
					!isMerged ? 'text-foreground font-medium' : 'text-muted-foreground'
				}`}
			>
				{t('all')}
			</span>
			<Switch
				checked={isMerged}
				onCheckedChange={checked =>
					setCategoryDisplayMode(checked ? 'merged' : 'all')
				}
				aria-label='Toggle category display mode'
			/>
			<span
				className={`text-sm transition-colors ${
					isMerged ? 'text-foreground font-medium' : 'text-muted-foreground'
				}`}
			>
				{t('merged')}
			</span>
		</div>
	)
}
