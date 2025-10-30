/**
 * Thread Detail Modal - Parallel Route
 *
 * This modal intercepts the /support-overview/thread/:id route
 * Shows thread details in a modal overlay while keeping the list in background
 *
 * Pattern: @modal/(.)thread/[threadId] intercepts /thread/[threadId]
 * The (.) means "intercept at the same level"
 */

import { supabaseServer } from '@/lib/supabase/server'
import { fetchThreadDetail } from '@/lib/supabase/queries-support'
import { notFound } from 'next/navigation'
import { ThreadDetailModal } from '@/components/thread-detail-modal'

interface ThreadModalPageProps {
	params: Promise<{
		threadId: string
	}>
}

export default async function ThreadModalPage({ params }: ThreadModalPageProps) {
	const { threadId } = await params

	// Fetch thread details
	let thread
	try {
		thread = await fetchThreadDetail(supabaseServer, threadId)
	} catch (error) {
		console.error('Error fetching thread:', error)
		notFound()
	}

	if (!thread) {
		notFound()
	}

	return <ThreadDetailModal thread={thread} />
}
