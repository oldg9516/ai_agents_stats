'use client'

import { KPICard } from './kpi-card'
import { IconRobot } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface AIDraftCoverageCardProps {
	data: SupportKPIs['aiDraftCoverage'] | null
}

/**
 * AI Draft Coverage Card - Shows % of threads with AI draft
 */
export function AIDraftCoverageCard({ data }: AIDraftCoverageCardProps) {
	const t = useTranslations()

	if (!data) {
		return (
			<KPICard
				title={t('kpi.aiDraftCoverage.title')}
				value='—'
				icon={<IconRobot />}
				description={t('kpi.aiDraftCoverage.description')}
				tooltipContent={t('kpi.aiDraftCoverage.tooltip')}
			/>
		)
	}

	return (
		<KPICard
			title={t('kpi.aiDraftCoverage.title')}
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconRobot />}
			description={t('kpi.aiDraftCoverage.description')}
			tooltipContent={t('kpi.aiDraftCoverage.tooltip')}
		/>
	)
}
