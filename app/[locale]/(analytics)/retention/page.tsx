import { RetentionContent } from '@/components/retention-content'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Retention | AI Agent Stats',
	description: 'Transparency trace of the AI flow for retention tickets',
}

export default function RetentionPage() {
	return (
		<div className='flex flex-1 flex-col'>
			<div className='@container/main flex flex-1 flex-col'>
				<RetentionContent />
			</div>
		</div>
	)
}
