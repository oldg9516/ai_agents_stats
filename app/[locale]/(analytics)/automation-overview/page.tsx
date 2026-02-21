import { AutomationOverviewContent } from '@/components/automation-overview-content'
import { TableSkeleton } from '@/components/loading/table-skeleton'
import { Suspense } from 'react'

/**
 * Automation Overview Page
 *
 * Shows auto-reply vs draft statistics based on extensible rules:
 * - Retention categories: determined by is_outstanding
 * - All others: determined by requires_system_action
 */
export default function AutomationOverviewPage() {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<AutomationOverviewContent />
		</Suspense>
	)
}
