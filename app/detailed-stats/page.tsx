import { Suspense } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { DetailedStatsContent } from '@/components/detailed-stats-content'
import { TableSkeleton } from '@/components/loading/table-skeleton'

/**
 * Detailed Stats Page - Full page view of detailed statistics table
 *
 * Features:
 * - Full-screen table view
 * - All table features (sorting, search, pagination, export)
 * - Same filter controls as main dashboard
 */
export default function DetailedStatsPage() {
	return (
		<SidebarProvider
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 72)',
					'--header-height': 'calc(var(--spacing) * 12)',
				} as React.CSSProperties
			}
		>
			<AppSidebar />
			<SidebarInset>
				<SiteHeader />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<Suspense fallback={<TableSkeleton />}>
							<DetailedStatsContent />
						</Suspense>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
