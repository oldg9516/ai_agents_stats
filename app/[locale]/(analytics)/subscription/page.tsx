import { SubscriptionContent } from '@/components/subscription-content'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Subscription | AI Agent Stats',
	description: 'Transparency trace of the AI flow for subscription support tickets',
}

export default function SubscriptionPage() {
	return (
		<div className='flex flex-1 flex-col'>
			<div className='@container/main flex flex-1 flex-col'>
				<SubscriptionContent />
			</div>
		</div>
	)
}
