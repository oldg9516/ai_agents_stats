'use client'

/**
 * Report Card Component - Preview for backlog reports in AI Chat
 */

import { Button } from '@/components/ui/button'
import { ReportPreview } from '@/types/chat'
import { IconFileText, IconChartBar, IconListDetails } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface ReportCardProps {
	reportId: number | string
	reportUrl: string
	preview: ReportPreview
}

export function ReportCard({ reportId, reportUrl, preview }: ReportCardProps) {
	const t = useTranslations('chat.reportCard')

	return (
		<div className='border rounded-lg p-4 bg-card my-2'>
			{/* Header */}
			<div className='flex justify-between items-start mb-3'>
				<div>
					<h3 className='font-semibold text-foreground'>{preview.period}</h3>
					<p className='text-sm text-muted-foreground'>
						{preview.period_days} {t('days')} • {preview.total_tickets.toLocaleString()} {t('tickets')}
					</p>
				</div>
				<span className='text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded flex items-center gap-1'>
					<IconListDetails className='w-3 h-3' />
					{preview.patterns_count} {t('patterns')}
				</span>
			</div>

			{/* Top Categories Mini Bar */}
			{preview.top_categories && preview.top_categories.length > 0 && (
				<div className='space-y-1.5 mb-3'>
					<p className='text-xs text-muted-foreground font-medium flex items-center gap-1'>
						<IconChartBar className='w-3 h-3' />
						{t('topCategories')}
					</p>
					{preview.top_categories.map(cat => (
						<div key={cat.name} className='flex items-center text-sm'>
							<span className='w-32 truncate text-muted-foreground'>{cat.name}</span>
							<div className='flex-1 mx-2 bg-muted rounded h-2'>
								<div
									className='bg-orange-500 h-2 rounded'
									style={{ width: `${Math.min(cat.percent, 100)}%` }}
								/>
							</div>
							<span className='text-muted-foreground text-xs w-12 text-right'>
								{cat.percent.toFixed(1)}%
							</span>
						</div>
					))}
				</div>
			)}

			{/* Summary excerpt */}
			{preview.executive_summary && (
				<p className='text-sm text-muted-foreground mb-3 line-clamp-2'>
					{preview.executive_summary}
				</p>
			)}

			{/* CTA Button */}
			<Link href={reportUrl}>
				<Button className='w-full bg-orange-500 hover:bg-orange-600 text-white'>
					<IconFileText className='w-4 h-4 mr-2' />
					{t('openFullReport')}
				</Button>
			</Link>

			{/* Report ID */}
			<p className='text-xs text-muted-foreground mt-2 text-center'>
				{t('reportId')}: {reportId}
			</p>
		</div>
	)
}
