'use client'

import { KPICard } from './kpi-card'
import { IconCheck } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface DataCollectionRateCardProps {
	data: SupportKPIs['dataCollectionRate'] | null
}

/**
 * Data Collection Rate Card - Shows % of resolved threads
 */
export function DataCollectionRateCard({ data }: DataCollectionRateCardProps) {
	const t = useTranslations()

	if (!data) {
		return (
			<KPICard
				title={t('kpi.resolutionRate.title')}
				value='—'
				icon={<IconCheck />}
				description={t('kpi.resolutionRate.description')}
			/>
		)
	}

	return (
		<KPICard
			title={t('kpi.resolutionRate.title')}
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconCheck />}
			description={t('kpi.resolutionRate.description')}
		/>
	)
}
