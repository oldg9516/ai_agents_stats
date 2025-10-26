'use client'

import { KPICard } from './kpi-card'
import { IconTrophy } from '@tabler/icons-react'
import type { KPIData } from '@/lib/supabase/types'

interface BestCategoryCardProps {
  data: KPIData['bestCategory']
}

export function BestCategoryCard({ data }: BestCategoryCardProps) {
  const displayValue = data.category
    ? `${data.category} (${data.percentage.toFixed(1)}%)`
    : 'No data'

  return (
    <KPICard
      title="Best Category"
      value={displayValue}
      trend={data.category ? data.trend : undefined}
      icon={<IconTrophy className="h-4 w-4" />}
      description="Highest quality category"
    />
  )
}
