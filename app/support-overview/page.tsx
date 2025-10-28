import { Metadata } from 'next'
import { Suspense } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { SupportOverviewContent } from '@/components/support-overview-content'
import { SupportOverviewSkeleton } from '@/components/loading/support-overview-skeleton'

export const metadata: Metadata = {
	title: 'Support Overview | AI Agent Stats',
	description: 'Monitor and analyze support thread operations',
}

/**
 * Support Overview Page
 *
 * Main page for support operations analytics
 * Shows KPIs, charts, and threads with quality metrics
 */
export default function SupportOverviewPage() {
	return (
		<SidebarProvider
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 72)',
					'--header-height': 'calc(var(--spacing) * 12)',
				} as React.CSSProperties
			}
		>
			<AppSidebar variant='inset' />
			<SidebarInset>
				<SiteHeader />
				<div className='flex flex-1 flex-col'>
					<div className='@container/main flex flex-1 flex-col gap-2'>
						<Suspense fallback={<SupportOverviewSkeleton />}>
							<SupportOverviewContent />
						</Suspense>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
