import { AgentsStatsContent } from '@/components/agents-stats-content'
import { AgentsStatsSkeleton } from '@/components/loading/agents-stats-skeleton'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
	title: 'Agent Statistics | AI Agent Stats',
	description: 'Analyze how efficiently agents use AI drafts',
}

/**
 * Agents Stats Page - Server Component
 *
 * Displays agent statistics showing how efficiently agents use AI drafts
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
