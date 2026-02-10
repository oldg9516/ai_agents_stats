'use client'

import { useBacklogReports, useLatestReportTimestamp } from '@/lib/queries/backlog-reports-queries'
import { useBacklogReportsFilters } from '@/lib/store/hooks'
import { IconAlertCircle, IconLoader2, IconPlus } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { GenerateReportDialog } from './backlog/generate-report-dialog'
import { GenerationIndicator } from './backlog/generation-indicator'
import { ReportCard } from './backlog/report-card'
import { ReportsFilterBar } from './backlog/reports-filter-bar'
import { SupportOverviewSkeleton } from './loading/support-overview-skeleton'
import { Button } from './ui/button'

/**
 * Backlog Reports Content - Client Component
 *
 * Displays list of AI-generated backlog analysis reports with:
 * - Generate report button
 * - Filters (period, date range, search)
 * - Grid of report cards
 * - Pagination
 * - Generation status indicator
 */
export function BacklogReportsContent() {
	const t = useTranslations()
	const queryClient = useQueryClient()
	const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)

	// Get filter state from optimized Zustand hook
	const {
		filters: backlogReportsFilters,
		page: backlogReportsPage,
		isGeneratingReport,
		generationStartedAt,
		setPage: setBacklogReportsPage,
		setIsGeneratingReport,
	} = useBacklogReportsFilters()

	// Fetch reports with filters
	const { data, isLoading, error, refetch, isFetching } = useBacklogReports(
		backlogReportsFilters,
		backlogReportsPage
	)

	// Poll for new reports when generating (checks latest timestamp every 30s)
	const { data: latestTimestamp } = useLatestReportTimestamp(isGeneratingReport)

	// Check if a new report appeared (generation completed)
	useEffect(() => {
		if (isGeneratingReport && generationStartedAt && latestTimestamp) {
			const startedAt = new Date(generationStartedAt)
			const latest = new Date(latestTimestamp)

			if (latest > startedAt) {
				// New report appeared - stop polling and refetch
				setIsGeneratingReport(false)
				refetch()
			}
		}
	}, [latestTimestamp, isGeneratingReport, generationStartedAt, setIsGeneratingReport, refetch])

	// Auto-stop generating indicator after 15 minutes (safety timeout)
	useEffect(() => {
		if (isGeneratingReport && generationStartedAt) {
			const timeoutMs = 15 * 60 * 1000 // 15 minutes
			const startedAt = new Date(generationStartedAt).getTime()
			const elapsed = Date.now() - startedAt

			if (elapsed >= timeoutMs) {
				setIsGeneratingReport(false)
			} else {
				const timeout = setTimeout(() => {
					setIsGeneratingReport(false)
				}, timeoutMs - elapsed)

				return () => clearTimeout(timeout)
			}
		}
	}, [isGeneratingReport, generationStartedAt, setIsGeneratingReport])

	// Pagination
	const pageSize = 10
	const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 0
	const hasNextPage = backlogReportsPage < totalPages - 1
	const hasPreviousPage = backlogReportsPage > 0

	// Show loading state
	if (isLoading) {
		return <SupportOverviewSkeleton />
	}

	// Show error state
	if (error) {
		return (
			<div className='flex flex-col items-center justify-center min-h-[400px] gap-4 px-4'>
				<IconAlertCircle className='h-12 w-12 text-destructive' />
				<div className='text-destructive text-lg font-semibold'>
					{t('errors.loadingReports')}
				</div>
				<div className='text-muted-foreground text-center'>{error.message}</div>
				<Button onClick={() => refetch()} variant='outline'>
					{t('common.retry')}
				</Button>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Header with Generate Button */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>
						{t('backlogReports.title')}
					</h1>
					<p className='text-muted-foreground'>
						{t('backlogReports.description')}
					</p>
				</div>
				<Button
					onClick={() => setIsGenerateDialogOpen(true)}
					disabled={isGeneratingReport}
				>
					{isGeneratingReport ? (
						<>
							<IconLoader2 className='mr-2 h-4 w-4 animate-spin' />
							{t('backlogReports.generate.generating')}
						</>
					) : (
						<>
							<IconPlus className='mr-2 h-4 w-4' />
							{t('backlogReports.generateReport')}
						</>
					)}
				</Button>
			</div>

			{/* Generation in progress indicator */}
			<GenerationIndicator />

			{/* Filters */}
			<ReportsFilterBar />

			{/* Reports Grid */}
			{data?.data.length === 0 ? (
				<div className='flex flex-col items-center justify-center min-h-[300px] gap-4 border rounded-lg bg-muted/50'>
					<div className='text-muted-foreground text-center'>
						{t('backlogReports.noReports')}
					</div>
					<Button
						variant='outline'
						onClick={() => setIsGenerateDialogOpen(true)}
						disabled={isGeneratingReport}
					>
						{t('backlogReports.generateFirst')}
					</Button>
				</div>
			) : (
				<>
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
						{data?.data.map(report => (
							<ReportCard key={report.id} report={report} />
						))}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className='flex items-center justify-center gap-2'>
							<Button
								variant='outline'
								size='sm'
								onClick={() => setBacklogReportsPage(backlogReportsPage - 1)}
								disabled={!hasPreviousPage || isFetching}
							>
								{t('common.previous')}
							</Button>
							<span className='text-sm text-muted-foreground'>
								{t('common.pageOf', {
									current: backlogReportsPage + 1,
									total: totalPages,
								})}
							</span>
							<Button
								variant='outline'
								size='sm'
								onClick={() => setBacklogReportsPage(backlogReportsPage + 1)}
								disabled={!hasNextPage || isFetching}
							>
								{t('common.next')}
							</Button>
						</div>
					)}
				</>
			)}

			{/* Generate Report Dialog */}
			<GenerateReportDialog
				open={isGenerateDialogOpen}
				onOpenChange={setIsGenerateDialogOpen}
			/>
		</div>
	)
}
