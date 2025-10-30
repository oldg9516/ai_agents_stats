'use client'

import { KPICard } from './kpi-card'
import { IconEdit } from '@tabler/icons-react'
import type { KPIData } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface RecordsChangedCardProps {
  data: KPIData['recordsChanged']
}

export function RecordsChangedCard({ data }: RecordsChangedCardProps) {
  const t = useTranslations()

  return (
    <KPICard
      title={t('kpi.recordsChanged.title')}
      value={data.current.toLocaleString()}
      trend={data.trend}
      icon={<IconEdit className="h-4 w-4" />}
      description={t('kpi.recordsChanged.description')}
      tooltipContent={t('kpi.recordsChanged.tooltip')}
    />
  )
}
