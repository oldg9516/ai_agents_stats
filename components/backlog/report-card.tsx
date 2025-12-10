'use client'

import type { BacklogReport, CategoryStats, MainPattern } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { IconCalendar, IconTicket, IconChartBar } from '@tabler/icons-react'
import { format, parseISO } from 'date-fns'
import { useMemo } from 'react'

interface ReportCardProps {
	report: BacklogReport
}

/**
 * Safely parse JSON data that might be a string or already parsed
 */
function safeJsonParse<T>(data: T | string, fallback: T): T {
	if (data === null || data === undefined) return fallback
	if (typeof data === 'string') {
		try {
			return JSON.parse(data) as T
		} catch {
			return fallback
		}
	}
	return data
}

/**
 * Report Card - Displays a backlog report summary in a card format
 *
 * Shows:
 * - Date range (Dec 3-9, 2025)
 * - Period in days badge (7 days)
 * - Total tickets count
 * - Top 3 categories with counts
 * - Generation date
 * - Click to navigate to detail page
 */
export function ReportCard({ report }: ReportCardProps) {
	const t = useTranslations()
	const router = useRouter()
	const params = useParams()
	const locale = params.locale as string

	// Parse JSON fields that might come as strings from the database
	const parsedData = useMemo(() => ({
		stats: safeJsonParse<CategoryStats>(report.stats, {}),
		mainPatterns: safeJsonParse<MainPattern[]>(report.main_patterns, []),
	}), [report.stats, report.main_patterns])

	// Format date range
	const dateFrom = parseISO(report.date_from)
	const dateTo = parseISO(report.date_to)
	const dateRange = `${format(dateFrom, 'MMM d')} - ${format(dateTo, 'MMM d, yyyy')}`

	// Format generation date
	const generatedAt = parseISO(report.created_at)
	const generatedDate = format(generatedAt, 'MMM d, yyyy HH:mm')

	// Get top 3 categories sorted by count
	const sortedCategories = Object.entries(parsedData.stats)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3)

	// Handle card click
	const handleClick = () => {
		router.push(`/${locale}/backlog-reports/${report.id}`)
	}

	return (
		<Card
			className='cursor-pointer transition-all hover:shadow-md hover:border-primary/50'
			onClick={handleClick}
		>
			<CardHeader className='pb-2'>
				<div className='flex items-start justify-between gap-2'>
					<CardTitle className='text-base font-semibold line-clamp-1'>
						{dateRange}
					</CardTitle>
					<Badge variant='secondary' className='shrink-0'>
						{report.period_days} {t('backlogReports.card.days')}
					</Badge>
				</div>
				<CardDescription className='flex items-center gap-1 text-xs'>
					<IconCalendar className='h-3 w-3' />
					{t('backlogReports.card.generated')} {generatedDate}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{/* Total Tickets */}
				<div className='flex items-center gap-2 mb-3'>
					<IconTicket className='h-4 w-4 text-muted-foreground' />
					<span className='font-medium'>{report.total_tickets}</span>
					<span className='text-muted-foreground text-sm'>
						{t('backlogReports.card.tickets')}
					</span>
				</div>

				{/* Top Categories */}
				<div className='space-y-2'>
					<div className='flex items-center gap-1 text-xs text-muted-foreground'>
						<IconChartBar className='h-3 w-3' />
						{t('backlogReports.card.topCategories')}
					</div>
					<div className='space-y-1'>
						{sortedCategories.map(([category, count]) => (
							<div
								key={category}
								className='flex items-center justify-between text-sm'
							>
								<span className='truncate max-w-[180px]' title={category}>
									{category}
								</span>
								<Badge variant='outline' className='text-xs'>
									{count}
								</Badge>
							</div>
						))}
					</div>
				</div>

				{/* Main Patterns Count */}
				{parsedData.mainPatterns.length > 0 && (
					<div className='mt-3 pt-3 border-t text-xs text-muted-foreground'>
						{parsedData.mainPatterns.length} {t('backlogReports.card.patterns')}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
