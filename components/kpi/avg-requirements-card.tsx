'use client'

import { KPICard } from './kpi-card'
import { IconListCheck } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface AvgRequirementsCardProps {
	data: SupportKPIs['avgRequirements'] | null
}

/**
 * Average Requirements Card - Shows avg requirements per thread
 */
export function AvgRequirementsCard({ data }: AvgRequirementsCardProps) {
	const t = useTranslations()

	if (!data) {
		return (
			<KPICard
				title={t('kpi.avgRequirements.title')}
				value='—'
				icon={<IconListCheck />}
				description={t('kpi.avgRequirements.description')}
			/>
		)
	}

	return (
		<KPICard
			title={t('kpi.avgRequirements.title')}
			value={data.current.toFixed(2)}
			trend={data.trend}
			icon={<IconListCheck />}
			description={t('kpi.avgRequirements.description')}
		/>
	)
}
