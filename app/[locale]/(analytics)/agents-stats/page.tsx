import { AgentsStatsContent } from '@/components/agents-stats-content'
import { AgentsStatsSkeleton } from '@/components/loading/agents-stats-skeleton'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
	title: 'Agent SLA stats | AI Agent Stats',
	description: 'First response time per agent',
}

/**
 * Agent SLA Stats Page - Server Component
 *
 * Displays per-agent first response time (customer request → first agent reply)
 */
export default function AgentsStatsPage() {
	return (
		<div className='flex flex-1 flex-col'>
			<div className='@container/main flex flex-1 flex-col gap-2'>
				<Suspense fallback={<AgentsStatsSkeleton />}>
					<AgentsStatsContent />
				</Suspense>
			</div>
		</div>
	)
}
