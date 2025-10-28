import { KPICard } from './kpi-card'
import { IconListCheck } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/supabase/types'

interface AvgRequirementsCardProps {
	data: SupportKPIs['avgRequirements'] | null
}

/**
 * Average Requirements Card - Shows avg requirements per thread
 */
export function AvgRequirementsCard({ data }: AvgRequirementsCardProps) {
	if (!data) {
		return (
			<KPICard
				title='Avg Requirements'
				value='—'
				icon={<IconListCheck />}
				description='Average requirements per thread'
			/>
		)
	}

	return (
		<KPICard
			title='Avg Requirements'
			value={data.current.toFixed(2)}
			trend={data.trend}
			icon={<IconListCheck />}
			description='Average requirements per thread'
		/>
	)
}
