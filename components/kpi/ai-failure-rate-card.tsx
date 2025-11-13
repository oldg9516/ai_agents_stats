'use client'

import { KPICard } from './kpi-card'
import { IconAlertTriangle } from '@tabler/icons-react'
import type { KPIDataNew } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface AIFailureRateCardProps {
	data: KPIDataNew['aiFailureRate']
}

/**
 * AI Failure Rate Card - NEW LOGIC
 *
 * Shows percentage of AI outputs that required significant changes:
 * Failure = (critical_error + meaningful_improvement) / total * 100
 */
export function AIFailureRateCard({ data }: AIFailureRateCardProps) {
	const t = useTranslations()

	return (
		<KPICard
			title={t('kpi.aiFailureRate.title')}
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconAlertTriangle className='h-4 w-4' />}
			description={t('kpi.aiFailureRate.description')}
			tooltipContent={t('kpi.aiFailureRate.tooltip')}
		/>
	)
}
