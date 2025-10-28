import { KPICard } from './kpi-card'
import { IconCheck } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/supabase/types'

interface DataCollectionRateCardProps {
	data: SupportKPIs['dataCollectionRate'] | null
}

/**
 * Data Collection Rate Card - Shows % of resolved threads
 */
export function DataCollectionRateCard({ data }: DataCollectionRateCardProps) {
	if (!data) {
		return (
			<KPICard
				title='Resolution Rate'
				value='—'
				icon={<IconCheck />}
				description='% of threads marked as resolved'
			/>
		)
	}

	return (
		<KPICard
			title='Resolution Rate'
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconCheck />}
			description='% of threads marked as resolved'
		/>
	)
}
