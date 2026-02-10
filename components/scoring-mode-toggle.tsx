'use client'

/**
 * Scoring Mode Toggle Component
 *
 * Allows switching between Legacy (percentage-based) and New (score-based) quality calculation modes.
 * Beautiful switch-style toggle for table header.
 */

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDashboardDisplayMode } from '@/lib/store/hooks/use-dashboard-filters'
import { useTranslations } from 'next-intl'

export function ScoringModeToggle() {
	const { scoringMode, setScoringMode } = useDashboardDisplayMode()
	const t = useTranslations('dashboard.scoringMode')

	const isNewMode = scoringMode === 'new'

	return (
		<div className='flex items-center gap-3'>
			<span
				className={`text-sm transition-colors ${
					!isNewMode ? 'text-foreground font-medium' : 'text-muted-foreground'
				}`}
			>
				{t('legacy')}
			</span>
			<Switch
				checked={isNewMode}
				onCheckedChange={checked => setScoringMode(checked ? 'new' : 'legacy')}
				aria-label='Toggle scoring mode'
			/>
			<span
				className={`text-sm transition-colors ${
					isNewMode ? 'text-foreground font-medium' : 'text-muted-foreground'
				}`}
			>
				{t('new')}
			</span>
		</div>
	)
}
