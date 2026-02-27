import { AIChatWithToggle } from '@/components/chat/ai-chat-with-toggle'
import SpinnerComponent from '@/components/SpinnerComponent'
import { Suspense } from 'react'

/**
 * AI Chat Page - Server Component
 *
 * Analytics chat interface for querying data with AI.
 * Supports toggle between Classic (n8n webhook) and Dash AI (Agno + CopilotKit) modes.
 */
export default function AIChatPage() {
	return (
		<Suspense fallback={<SpinnerComponent />}>
			<div className='h-[calc(100vh-var(--header-height))]'>
				<AIChatWithToggle webhookUrl='/api/chat' />
			</div>
		</Suspense>
	)
}
