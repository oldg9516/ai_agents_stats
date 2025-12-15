import { AIChat } from '@/components/chat'
import SpinnerComponent from '@/components/SpinnerComponent'
import { Suspense } from 'react'

/**
 * AI Chat Page - Server Component
 *
 * Analytics chat interface for querying data with AI
 */
export default function AIChatPage() {
	return (
		<Suspense fallback={<SpinnerComponent />}>
			<div className='h-[calc(100vh-var(--header-height))]'>
				<AIChat webhookUrl='/api/chat' />
			</div>
		</Suspense>
	)
}
