import { NotFoundPage } from '@/components/not-found-page'

/**
 * Thread Detail 404 Page - shown when thread doesn't exist
 */
export default function NotFound() {
	return (
		<NotFoundPage
			title='Thread Not Found'
			description="The support thread you're looking for doesn't exist or has been removed."
			returnPath='/support-overview'
		/>
	)
}
