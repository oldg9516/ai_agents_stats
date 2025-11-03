import { NotFoundPage } from '@/components/not-found-page'

/**
 * Settings 404 Page - shown when settings page doesn't exist
 */
export default function NotFound() {
	return <NotFoundPage returnPath='/settings' />
}
