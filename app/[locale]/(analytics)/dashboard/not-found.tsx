import { NotFoundPage } from '@/components/not-found-page'

/**
 * Dashboard 404 Page - shown when dashboard sub-page doesn't exist
 */
export default function NotFound() {
	return <NotFoundPage returnPath='/dashboard' />
}
