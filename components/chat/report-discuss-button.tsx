'use client'

/**
 * Report Discuss Button - Link to report page with chat context
 */

import { Button } from '@/components/ui/button'
import { IconMessageCircle, IconArrowRight } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { setReportChatContext, ReportChatRedirectContext } from '@/types/chat'

interface ReportDiscussButtonProps {
	reportId: string
	reportUrl: string
	initialQuestion?: string
	initialAnswer?: string
	className?: string
}

export function ReportDiscussButton({
	reportId,
	reportUrl,
	initialQuestion,
	initialAnswer,
	className = '',
}: ReportDiscussButtonProps) {
	const t = useTranslations('reportChat')
	const router = useRouter()
	const params = useParams()
	const locale = params.locale as string

	const handleClick = () => {
		// Save context for report chat to pick up
		const context: ReportChatRedirectContext = {
			report_id: reportId,
			initial_question: initialQuestion,
			initial_answer: initialAnswer,
			from_main_chat: true,
		}
		setReportChatContext(context)

		// Navigate to report page
		// reportUrl might be relative like /ru/backlog-reports/123 or just /backlog-reports/123
		const url = reportUrl.startsWith(`/${locale}`)
			? reportUrl
			: `/${locale}${reportUrl}`

		router.push(url)
	}

	return (
		<Button
			variant='outline'
			size='sm'
			onClick={handleClick}
			className={`flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950 ${className}`}
		>
			<IconMessageCircle className='w-4 h-4' />
			{t('goToReport')}
			<IconArrowRight className='w-4 h-4' />
		</Button>
	)
}

/**
 * Deep dive hint message - shows when AI suggests going to report page
 */
interface DeepDiveHintProps {
	reportId: string
	reportUrl: string
	className?: string
}

export function DeepDiveHint({
	reportId,
	reportUrl,
	className = '',
}: DeepDiveHintProps) {
	const t = useTranslations('reportChat')

	return (
		<div className={`mt-3 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg ${className}`}>
			<p className='text-sm text-orange-800 dark:text-orange-300 mb-2'>
				{t('deepDiveHint')}
			</p>
			<ReportDiscussButton reportId={reportId} reportUrl={reportUrl} />
		</div>
	)
}
