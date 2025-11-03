import { NotFoundPage } from '@/components/not-found-page'

/**
 * Docs 404 Page - shown when documentation page doesn't exist
 */
export default function NotFound() {
	return <NotFoundPage returnPath='/docs' />
}
