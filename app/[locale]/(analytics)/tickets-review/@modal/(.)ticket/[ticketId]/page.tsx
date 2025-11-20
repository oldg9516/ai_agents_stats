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
import { fetchTicketDetail } from '@/lib/supabase/queries-tickets-review'
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

	// Fetch ticket details
	let ticket
	try {
		ticket = await fetchTicketDetail(supabaseServer, parseInt(ticketId))
	} catch (error) {
		console.error('Error fetching ticket:', error)
		notFound()
	}

	if (!ticket) {
		notFound()
	}

	return <TicketDetailModal ticket={ticket} />
}
