'use client'

/**
 * Report Card Component - Preview for backlog reports in AI Chat
 */

import { Button } from '@/components/ui/button'
import { ReportPreview, setReportChatContext } from '@/types/chat'
import { IconFileText, IconChartBar, IconListDetails } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

interface ReportCardProps {
	reportId: number | string
	reportUrl: string
	preview: ReportPreview
	/** The user question that led to this report */
	initialQuestion?: string
	/** The AI answer about this report */
	initialAnswer?: string
}

export function ReportCard({ reportId, reportUrl, preview, initialQuestion, initialAnswer }: ReportCardProps) {
	const t = useTranslations('chat.reportCard')
	const router = useRouter()
	const params = useParams()
	const locale = params.locale as string

	const handleOpenReport = () => {
		// Save context for report chat to pick up
		setReportChatContext({
			report_id: String(reportId),
			initial_question: initialQuestion,
			initial_answer: initialAnswer,
			from_main_chat: true,
		})
		// Navigate to report page (ensure locale prefix)
		const url = reportUrl.startsWith(`/${locale}`)
			? reportUrl
			: `/${locale}${reportUrl}`
		router.push(url)
	}

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
			<Button
				onClick={handleOpenReport}
				className='w-full bg-orange-500 hover:bg-orange-600 text-white'
			>
				<IconFileText className='w-4 h-4 mr-2' />
				{t('openFullReport')}
			</Button>
		</div>
	)
}
