'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { AutoCloseStats } from '@/lib/db/types'
import { useTranslations } from 'next-intl'
import { memo } from 'react'

interface AutoCloseTableProps {
	data: AutoCloseStats
}

/**
 * Auto-Close Breakdown Table
 *
 * Shows how many tickets were closed automatically by the AI agent,
 * grouped by close tag (e.g. "order comment", spam, auto-notification).
 * Source: ai_agent_tasks (ground truth, separate from the main pipeline).
 */
export const AutoCloseTable = memo(function AutoCloseTable({
	data,
}: AutoCloseTableProps) {
	const t = useTranslations('automationOverview')

	if (data.tags.length === 0) return null

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center gap-1.5'>
					<CardTitle className='text-lg sm:text-xl'>
						{t('autoCloseTitle')}
					</CardTitle>
					<InfoTooltip content={t('autoCloseTooltip')} />
				</div>
				<CardDescription className='text-sm'>
					{t('autoCloseDescription')}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className='rounded-md border overflow-x-auto'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className='w-[260px]'>{t('autoCloseTag')}</TableHead>
								<TableHead className='text-right w-[140px]'>
									{t('autoCloseTickets')}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow className='bg-muted/60 font-semibold hover:bg-muted/60 border-b-2'>
								<TableCell>
									<span className='pl-1'>{t('totals')}</span>
								</TableCell>
								<TableCell className='text-right'>{data.totalTickets}</TableCell>
							</TableRow>
							{data.tags.map((tag) => (
								<TableRow key={tag.tag}>
									<TableCell className='font-medium'>{tag.tag}</TableCell>
									<TableCell className='text-right'>{tag.ticketCount}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
})
