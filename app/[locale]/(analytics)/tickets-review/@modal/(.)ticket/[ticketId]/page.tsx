/**
 * Ticket Detail Modal - Parallel Route
 *
 * This modal intercepts the /tickets-review/ticket/:id route
 * Shows ticket details in a modal overlay while keeping the table in background
 *
 * Pattern: @modal/(.)ticket/[ticketId] intercepts /ticket/[ticketId]
 * The (.) means "intercept at the same level"
 */

import { supabaseServer } from '@/lib/supabase/server'
import {
	fetchTicketDetail,
	fetchAdjacentTicketIds,
} from '@/lib/supabase/queries-tickets-review'
import { notFound } from 'next/navigation'
import { TicketDetailModal } from '@/components/ticket-detail-modal'

interface TicketModalPageProps {
	params: Promise<{
		ticketId: string
	}>
}

export default async function TicketModalPage({
	params,
}: TicketModalPageProps) {
	const { ticketId } = await params
	const ticketIdNum = parseInt(ticketId)

	// Fetch ticket details and adjacent IDs in parallel
	let ticket
	let adjacentIds = { prevId: null as number | null, nextId: null as number | null }

	try {
		const [ticketData, adjacentData] = await Promise.all([
			fetchTicketDetail(supabaseServer, ticketIdNum),
			fetchAdjacentTicketIds(supabaseServer, ticketIdNum),
		])
		ticket = ticketData
		adjacentIds = adjacentData
	} catch (error) {
		console.error('Error fetching ticket:', error)
		notFound()
	}

	if (!ticket) {
		notFound()
	}

	return (
		<TicketDetailModal
			ticket={ticket}
			prevTicketId={adjacentIds.prevId}
			nextTicketId={adjacentIds.nextId}
		/>
	)
}
