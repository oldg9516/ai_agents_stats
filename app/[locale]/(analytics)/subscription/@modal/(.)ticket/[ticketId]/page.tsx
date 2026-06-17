import { fetchRetentionTrace } from '@/lib/db/queries-retention'
import { notFound } from 'next/navigation'
import { RetentionTraceModal } from '@/components/retention-trace-modal'

interface Props {
	params: Promise<{ ticketId: string }>
}

export default async function SubscriptionTraceModalPage({ params }: Props) {
	const { ticketId } = await params

	let trace
	try {
		trace = await fetchRetentionTrace(decodeURIComponent(ticketId))
	} catch (error) {
		console.error('Error fetching subscription trace:', error)
		notFound()
	}

	if (!trace) notFound()

	return <RetentionTraceModal trace={trace} />
}
