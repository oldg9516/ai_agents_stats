'use client'

import { KPICard } from './kpi-card'
import { IconDatabase } from '@tabler/icons-react'
import type { KPIData } from '@/lib/supabase/types'

interface TotalRecordsCardProps {
  data: KPIData['totalRecords']
}

export function TotalRecordsCard({ data }: TotalRecordsCardProps) {
  return (
    <KPICard
      title="Total Records"
      value={data.current.toLocaleString()}
      trend={data.trend}
      icon={<IconDatabase className="h-4 w-4" />}
      description="Total qualified agent records"
    />
  )
}
