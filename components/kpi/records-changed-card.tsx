'use client'

import { KPICard } from './kpi-card'
import { IconEdit } from '@tabler/icons-react'
import type { KPIData } from '@/lib/supabase/types'

interface RecordsChangedCardProps {
  data: KPIData['recordsChanged']
}

export function RecordsChangedCard({ data }: RecordsChangedCardProps) {
  return (
    <KPICard
      title="Records Changed"
      value={data.current.toLocaleString()}
      trend={data.trend}
      icon={<IconEdit className="h-4 w-4" />}
      description="Human edited AI outputs"
    />
  )
}
