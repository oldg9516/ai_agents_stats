'use client'

import { KPICard } from './kpi-card'
import { IconChartBar } from '@tabler/icons-react'
import type { KPIData } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { memo } from 'react'

interface AverageQualityCardProps {
  data: KPIData['averageQuality']
}

export const AverageQualityCard = memo(function AverageQualityCard({ data }: AverageQualityCardProps) {
  const t = useTranslations()

  return (
    <KPICard
      title={t('kpi.averageQuality.title')}
      value={`${data.current.toFixed(1)}%`}
      trend={data.trend}
      icon={<IconChartBar className="h-4 w-4" />}
      description={t('kpi.averageQuality.description')}
      tooltipContent={t('kpi.averageQuality.tooltip')}
    />
  )
})
