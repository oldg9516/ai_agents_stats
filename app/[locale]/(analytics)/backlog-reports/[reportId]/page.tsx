import { BacklogReportDetail } from '@/components/backlog-report-detail'
import { SupportOverviewSkeleton } from '@/components/loading/support-overview-skeleton'
import { Suspense } from 'react'

interface BacklogReportDetailPageProps {
	params: Promise<{ reportId: string }>
}

/**
 * Backlog Report Detail Page - Server Component
 *
 * Displays detailed view of a single backlog report
 */
export default async function BacklogReportDetailPage({
	params,
}: BacklogReportDetailPageProps) {
	const { reportId } = await params

	return (
		<Suspense fallback={<SupportOverviewSkeleton />}>
			<BacklogReportDetail reportId={reportId} />
		</Suspense>
	)
}
