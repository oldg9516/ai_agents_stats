import { NotFoundPage } from '@/components/not-found-page'

/**
 * Detailed Stats 404 Page - shown when detailed stats page doesn't exist
 */
export default function NotFound() {
	return <NotFoundPage returnPath='/detailed-stats' />
}
