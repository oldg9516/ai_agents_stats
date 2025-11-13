'use client'

import { KPICard } from './kpi-card'
import { IconTrophy } from '@tabler/icons-react'
import type { KPIDataNew } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface BestCategoryCardNewProps {
	data: KPIDataNew['bestCategory']
}

/**
 * Best Category Card - NEW LOGIC
 *
 * Shows category with highest AI Success Rate
 */
export function BestCategoryCardNew({ data }: BestCategoryCardNewProps) {
	const t = useTranslations()

	return (
		<KPICard
			title={t('kpi.bestCategory.title')}
			value={data.category}
			subValue={`${data.successRate.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconTrophy className='h-4 w-4' />}
			description={t('kpi.bestCategory.description')}
			tooltipContent={t('kpi.bestCategory.tooltip')}
		/>
	)
}
