import { ActionAnalysisContent } from '@/components/action-analysis-content'
import { TableSkeleton } from '@/components/loading/table-skeleton'
import { Suspense } from 'react'

/**
 * Action Analysis Quality Page
 *
 * Shows accuracy of AI action determination vs agent verification:
 * - KPIs: requires_system_action accuracy, action_type accuracy
 * - Chart: action type distribution (AI predicted vs verified)
 * - Table: category breakdown with automation potential scores
 */
export default function ActionAnalysisPage() {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<ActionAnalysisContent />
		</Suspense>
	)
}
