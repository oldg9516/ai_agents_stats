'use client'

import { KPICard } from './kpi-card'
import { IconMessageCircle } from '@tabler/icons-react'
import type { SupportKPIs } from '@/lib/db/types'
import { useTranslations } from 'next-intl'

interface ReplyRequiredCardProps {
	data: SupportKPIs['replyRequired'] | null
}

/**
 * Reply Required Card - Shows % of threads requiring reply
 */
export function ReplyRequiredCard({ data }: ReplyRequiredCardProps) {
	const t = useTranslations()

	if (!data) {
		return (
			<KPICard
				title={t('kpi.replyRequired.title')}
				value='—'
				icon={<IconMessageCircle />}
				description={t('kpi.replyRequired.description')}
				tooltipContent={t('kpi.replyRequired.tooltip')}
			/>
		)
	}

	return (
		<KPICard
			title={t('kpi.replyRequired.title')}
			value={`${data.current.toFixed(1)}%`}
			trend={data.trend}
			icon={<IconMessageCircle />}
			description={t('kpi.replyRequired.description')}
			tooltipContent={t('kpi.replyRequired.tooltip')}
		/>
	)
}
