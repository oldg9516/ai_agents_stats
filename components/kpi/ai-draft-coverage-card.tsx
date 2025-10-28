import { KPICard } from './kpi-card'
import { IconRobot } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/supabase/types'

interface AIDraftCoverageCardProps {
	data: SupportKPIs['aiDraftCoverage'] | null
}

/**
 * AI Draft Coverage Card - Shows % of threads with AI draft
 */
export function AIDraftCoverageCard({ data }: AIDraftCoverageCardProps) {
	if (!data) {
		return (
			<KPICard
				title='AI Draft Coverage'
				value='—'
				icon={<IconRobot />}
				description='% of threads with AI draft reply'
			/>
		)
	}

	return (
		<KPICard
			title='AI Draft Coverage'
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconRobot />}
			description='% of threads with AI draft reply'
		/>
	)
}
