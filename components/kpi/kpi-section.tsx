'use client'

import { TotalRecordsCard } from './total-records-card'
import { AverageQualityCard } from './average-quality-card'
import { BestCategoryCard } from './best-category-card'
import { RecordsChangedCard } from './records-changed-card'
import type { KPIData } from '@/lib/supabase/types'

interface KPISectionProps {
  data: KPIData
}

/**
 * KPI Section Component
 *
 * Container for all 4 KPI cards with responsive grid layout
 */
export function KPISection({ data }: KPISectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TotalRecordsCard data={data.totalRecords} />
      <AverageQualityCard data={data.averageQuality} />
      <BestCategoryCard data={data.bestCategory} />
      <RecordsChangedCard data={data.recordsChanged} />
    </div>
  )
}
