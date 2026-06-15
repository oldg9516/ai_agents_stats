import { fetchRetentionTrace } from '@/lib/db/queries-retention'
import { notFound } from 'next/navigation'
import { RetentionTraceModal } from '@/components/retention-trace-modal'
import { Metadata } from 'next'

interface Props {
	params: Promise<{ ticketId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { ticketId } = await params
	return { title: `Ticket ${ticketId} | Retention` }
}

export default async function RetentionTracePage({ params }: Props) {
	const { ticketId } = await params

	let trace
	try {
		trace = await fetchRetentionTrace(decodeURIComponent(ticketId))
	} catch (error) {
		console.error('Error fetching retention trace:', error)
		notFound()
	}

	if (!trace) notFound()

	return <RetentionTraceModal trace={trace} />
}
