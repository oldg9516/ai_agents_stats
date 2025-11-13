'use client'

import { KPICard } from './kpi-card'
import { IconCircleCheck } from '@tabler/icons-react'
import type { KPIDataNew } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface AISuccessRateCardProps {
	data: KPIDataNew['aiSuccessRate']
}

/**
 * AI Success Rate Card - NEW LOGIC
 *
 * Shows percentage of AI outputs that were successful:
 * Success = (no_significant_change + stylistic_preference) / total * 100
 */
export function AISuccessRateCard({ data }: AISuccessRateCardProps) {
	const t = useTranslations()

	return (
		<KPICard
			title={t('kpi.aiSuccessRate.title')}
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconCircleCheck className='h-4 w-4' />}
			description={t('kpi.aiSuccessRate.description')}
			tooltipContent={t('kpi.aiSuccessRate.tooltip')}
		/>
	)
}
