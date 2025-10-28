import { KPICard } from './kpi-card'
import { IconMessageCircle } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/supabase/types'

interface ReplyRequiredCardProps {
	data: SupportKPIs['replyRequired'] | null
}

/**
 * Reply Required Card - Shows % of threads requiring reply
 */
export function ReplyRequiredCard({ data }: ReplyRequiredCardProps) {
	if (!data) {
		return (
			<KPICard
				title='Reply Required'
				value='—'
				icon={<IconMessageCircle />}
				description='% of threads requiring customer response'
			/>
		)
	}

	return (
		<KPICard
			title='Reply Required'
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconMessageCircle />}
			description='% of threads requiring customer response'
		/>
	)
}
