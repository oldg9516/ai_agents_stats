'use client'

import { AIChat } from '@/components/chat'

export default function AIChatPage() {
	// Use internal API route that handles authentication server-side
	const webhookUrl = '/api/chat'

	return (
		<div className='h-[calc(100vh-var(--header-height))]'>
			<AIChat webhookUrl={webhookUrl} />
		</div>
	)
}
