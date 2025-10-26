'use client'

import { KPICard } from './kpi-card'
import { IconChartBar } from '@tabler/icons-react'
import type { KPIData } from '@/lib/supabase/types'

interface AverageQualityCardProps {
  data: KPIData['averageQuality']
}

export function AverageQualityCard({ data }: AverageQualityCardProps) {
  return (
    <KPICard
      title="Average Quality"
      value={`${data.current.toFixed(1)}%`}
      trend={data.trend}
      icon={<IconChartBar className="h-4 w-4" />}
      description="Avg quality across categories"
    />
  )
}
