'use client'

import { useBacklogReportDetail } from '@/lib/queries/backlog-reports-queries'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { SupportOverviewSkeleton } from './loading/support-overview-skeleton'
import {
	IconArrowLeft,
	IconAlertCircle,
	IconTicket,
	IconCalendar,
	IconClock,
} from '@tabler/icons-react'
import { format, parseISO } from 'date-fns'
import { PatternsList } from './backlog/patterns-list'
import { TemporalTrends } from './backlog/temporal-trends'
import { SpecificIssues } from './backlog/specific-issues'
import { WeeklyStatsSection } from './backlog/weekly-stats-section'
import { RecommendationsList } from './backlog/recommendations-list'
import { StatsByCategory } from './backlog/stats-by-category'
import { useMemo } from 'react'

interface BacklogReportDetailProps {
	reportId: string
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
 * Backlog Report Detail - Client Component
 *
 * Displays full report with:
 * - Back button
 * - Header with dates
 * - Overview KPIs (3 cards)
 * - Executive Summary
 * - Stats by Category
 * - Tabs: Patterns | Trends | Issues | Weekly Stats | Recommendations
 */
export function BacklogReportDetail({ reportId }: BacklogReportDetailProps) {
	const t = useTranslations()
	const router = useRouter()
	const params = useParams()
	const locale = params.locale as string

	// Fetch report data
	const { data: report, isLoading, error } = useBacklogReportDetail(reportId)

	// Parse JSON fields that might come as strings from the database
	// Must be called before any conditional returns to follow Rules of Hooks
	const parsedData = useMemo(() => {
		if (!report) {
			return {
				stats: {},
				weeklyStats: [],
				mainPatterns: [],
				temporalTrends: [],
				specificIssues: [],
				recommendations: [],
			}
		}
		return {
			stats: safeJsonParse(report.stats, {}),
			weeklyStats: safeJsonParse(report.weekly_stats, []),
			mainPatterns: safeJsonParse(report.main_patterns, []),
			temporalTrends: safeJsonParse(report.temporal_trends, []),
			specificIssues: safeJsonParse(report.specific_issues, []),
			recommendations: safeJsonParse(report.recommendations, []),
		}
	}, [report])

	// Handle back navigation
	const handleBack = () => {
		router.push(`/${locale}/backlog-reports`)
	}

	// Loading state
	if (isLoading) {
		return <SupportOverviewSkeleton />
	}

	// Error state
	if (error || !report) {
		return (
			<div className='flex flex-col items-center justify-center min-h-[400px] gap-4 px-4'>
				<IconAlertCircle className='h-12 w-12 text-destructive' />
				<div className='text-destructive text-lg font-semibold'>
					{t('errors.reportNotFound')}
				</div>
				<div className='text-muted-foreground text-center'>
					{error?.message || t('errors.reportLoadFailed')}
				</div>
				<Button onClick={handleBack} variant='outline'>
					{t('backlogReports.detail.back')}
				</Button>
			</div>
		)
	}

	// Format dates
	const dateFrom = parseISO(report.date_from)
	const dateTo = parseISO(report.date_to)
	const dateRange = `${format(dateFrom, 'MMM d')} - ${format(dateTo, 'MMM d, yyyy')}`
	const generatedAt = parseISO(report.created_at)
	const generatedDate = format(generatedAt, 'MMM d, yyyy HH:mm')

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Back Button */}
			<Button
				variant='ghost'
				className='w-fit -ml-2'
				onClick={handleBack}
			>
				<IconArrowLeft className='mr-2 h-4 w-4' />
				{t('backlogReports.detail.back')}
			</Button>

			{/* Header */}
			<div className='space-y-1'>
				<div className='flex items-center gap-3 flex-wrap'>
					<h1 className='text-2xl font-bold tracking-tight'>{dateRange}</h1>
					<Badge variant='secondary'>
						{report.period_days} {t('backlogReports.card.days')}
					</Badge>
				</div>
				<p className='text-muted-foreground flex items-center gap-1'>
					<IconClock className='h-4 w-4' />
					{t('backlogReports.card.generated')} {generatedDate}
				</p>
			</div>

			{/* Overview KPIs */}
			<div className='grid gap-4 md:grid-cols-3'>
				<Card>
					<CardHeader className='pb-2'>
						<CardDescription className='flex items-center gap-1'>
							<IconTicket className='h-4 w-4' />
							{t('backlogReports.detail.totalTickets')}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='text-3xl font-bold'>{report.total_tickets}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-2'>
						<CardDescription className='flex items-center gap-1'>
							<IconCalendar className='h-4 w-4' />
							{t('backlogReports.detail.periodCovered')}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='text-3xl font-bold'>
							{report.period_days} {t('backlogReports.card.days')}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-2'>
						<CardDescription>
							{t('backlogReports.detail.categoriesCount')}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='text-3xl font-bold'>
							{Object.keys(parsedData.stats).length}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Executive Summary */}
			<Card>
				<CardHeader>
					<CardTitle>{t('backlogReports.detail.executiveSummary')}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground whitespace-pre-wrap leading-relaxed'>
						{report.executive_summary}
					</p>
				</CardContent>
			</Card>

			{/* Stats by Category */}
			<StatsByCategory stats={parsedData.stats} total={report.total_tickets} />

			{/* Tabs for detailed sections */}
			<Tabs defaultValue='patterns' className='w-full'>
				<TabsList className='grid w-full grid-cols-5'>
					<TabsTrigger value='patterns'>
						{t('backlogReports.detail.patterns')}
					</TabsTrigger>
					<TabsTrigger value='trends'>
						{t('backlogReports.detail.trends')}
					</TabsTrigger>
					<TabsTrigger value='issues'>
						{t('backlogReports.detail.issues')}
					</TabsTrigger>
					<TabsTrigger value='weekly'>
						{t('backlogReports.detail.weeklyStats')}
					</TabsTrigger>
					<TabsTrigger value='recommendations'>
						{t('backlogReports.detail.recommendations')}
					</TabsTrigger>
				</TabsList>

				<TabsContent value='patterns' className='mt-4'>
					<PatternsList patterns={parsedData.mainPatterns} />
				</TabsContent>

				<TabsContent value='trends' className='mt-4'>
					<TemporalTrends trends={parsedData.temporalTrends} />
				</TabsContent>

				<TabsContent value='issues' className='mt-4'>
					<SpecificIssues issues={parsedData.specificIssues} />
				</TabsContent>

				<TabsContent value='weekly' className='mt-4'>
					<WeeklyStatsSection weeklyStats={parsedData.weeklyStats} />
				</TabsContent>

				<TabsContent value='recommendations' className='mt-4'>
					<RecommendationsList recommendations={parsedData.recommendations} />
				</TabsContent>
			</Tabs>
		</div>
	)
}
