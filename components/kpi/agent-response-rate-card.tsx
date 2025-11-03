'use client'

import { KPICard } from './kpi-card'
import { IconUserCheck } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface AgentResponseRateCardProps {
	data: SupportKPIs['agentResponseRate'] | null
}

/**
 * Agent Response Rate Card - Shows % of threads reviewed by qualified agents
 */
export function AgentResponseRateCard({ data }: AgentResponseRateCardProps) {
	const t = useTranslations()

	if (!data) {
		return (
			<KPICard
				title={t('kpi.agentResponseRate.title')}
				value='—'
				icon={<IconUserCheck />}
				description={t('kpi.agentResponseRate.description')}
				tooltipContent={t('kpi.agentResponseRate.tooltip')}
			/>
		)
	}

	return (
		<KPICard
			title={t('kpi.agentResponseRate.title')}
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconUserCheck />}
			description={t('kpi.agentResponseRate.description')}
			tooltipContent={t('kpi.agentResponseRate.tooltip')}
		/>
	)
}
