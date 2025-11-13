'use client'

import { KPICard } from './kpi-card'
import { IconAlertCircle } from '@tabler/icons-react'
import type { KPIDataNew } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface WorstCategoryCardProps {
	data: KPIDataNew['worstCategory']
}

/**
 * Worst Category Card - NEW LOGIC
 *
 * Shows category with highest AI Failure Rate
 */
export function WorstCategoryCard({ data }: WorstCategoryCardProps) {
	const t = useTranslations()

	return (
		<KPICard
			title={t('kpi.worstCategory.title')}
			value={data.category}
			subValue={`${data.failureRate.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconAlertCircle className='h-4 w-4' />}
			description={t('kpi.worstCategory.description')}
			tooltipContent={t('kpi.worstCategory.tooltip')}
		/>
	)
}
