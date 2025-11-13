'use client'

import type { KPIDataNew } from '@/lib/supabase/types'
import { AISuccessRateCard } from './ai-success-rate-card'
import { AIFailureRateCard } from './ai-failure-rate-card'
import { BestCategoryCardNew } from './best-category-card-new'
import { WorstCategoryCard } from './worst-category-card'
import { TotalRecordsCard } from './total-records-card'

interface KPISectionNewProps {
	data: KPIDataNew
}

/**
 * KPI Section Component - NEW LOGIC
 *
 * Container for 5 KPI cards with responsive grid layout:
 * 1. Total Records
 * 2. AI Success Rate (no_significant_change + stylistic_preference)
 * 3. AI Failure Rate (critical_error + meaningful_improvement)
 * 4. Best Category (highest success rate)
 * 5. Worst Category (highest failure rate)
 */
export function KPISectionNew({ data }: KPISectionNewProps) {
	return (
		<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
			<TotalRecordsCard data={data.totalRecords} />
			<AISuccessRateCard data={data.aiSuccessRate} />
			<AIFailureRateCard data={data.aiFailureRate} />
			<BestCategoryCardNew data={data.bestCategory} />
			<WorstCategoryCard data={data.worstCategory} />
		</div>
	)
}
