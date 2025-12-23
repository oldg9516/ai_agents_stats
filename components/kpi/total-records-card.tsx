'use client'

import { KPICard } from './kpi-card'
import { IconDatabase } from '@tabler/icons-react'
import type { KPIData } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { memo } from 'react'

interface TotalRecordsCardProps {
  data: KPIData['totalRecords']
}

export const TotalRecordsCard = memo(function TotalRecordsCard({ data }: TotalRecordsCardProps) {
  const t = useTranslations()

  return (
    <KPICard
      title={t('kpi.totalRecords.title')}
      value={data.current.toLocaleString()}
      trend={data.trend}
      icon={<IconDatabase className="h-4 w-4" />}
      description={t('kpi.totalRecords.description')}
      tooltipContent={t('kpi.totalRecords.tooltip')}
    />
  )
})
