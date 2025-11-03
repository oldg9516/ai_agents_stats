import { NotFoundPage } from '@/components/not-found-page'

/**
 * Support Overview 404 Page - shown when support overview page doesn't exist
 */
export default function NotFound() {
	return <NotFoundPage returnPath='/support-overview' />
}
