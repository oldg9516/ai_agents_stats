import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { auth } from '@/auth'
import { routing } from './i18n/routing'

// Create intl middleware
const intlMiddleware = createIntlMiddleware(routing)

// Define public routes that don't require authentication
const publicRoutes = ['/', '/docs', '/login', '/unauthorized']

// Check if the path is a public route
function isPublicRoute(pathWithoutLocale: string): boolean {
	return publicRoutes.some(
		(route) =>
			pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
	)
}

// Static file extensions that should skip middleware
const STATIC_EXTENSIONS = [
	'.js', '.css', '.map', '.json',
	'.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
	'.woff', '.woff2', '.ttf', '.eot',
	'.xml', '.txt', '.robots',
]

// Check if path should skip middleware entirely
function shouldSkipMiddleware(pathname: string): boolean {
	return (
		pathname.startsWith('/api/auth') ||
		pathname.startsWith('/_next') ||
		pathname.startsWith('/favicon') ||
		STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))
	)
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Skip middleware for static files and auth API routes
	if (shouldSkipMiddleware(pathname)) {
		return NextResponse.next()
	}

	// Get path without locale prefix
	const pathWithoutLocale = pathname.replace(/^\/(ru|en)/, '') || '/'

	// For public routes, just run intl middleware
	if (isPublicRoute(pathWithoutLocale)) {
		return intlMiddleware(request)
	}

	// Check Auth.js session
	const session = await auth()

	// Get locale from path or default
	const locale = pathname.match(/^\/(ru|en)/)?.[1] || 'ru'

	// No session — redirect to login
	if (!session?.user) {
		const loginUrl = new URL(`/${locale}/login`, request.url)
		loginUrl.searchParams.set('redirect', pathname)
		return NextResponse.redirect(loginUrl)
	}

	// User is authenticated — run intl middleware
	return intlMiddleware(request)
}

export const config = {
	// Match only internationalized pathnames
	matcher: [
		// Enable a redirect to a matching locale at the root
		'/',

		// Set a cookie to remember the previous locale for
		// all requests that have a locale prefix
		'/(ru|en)/:path*',

		// Enable redirects that add missing locales
		// (e.g. `/pathnames` -> `/en/pathnames`)
		// Exclude api routes from internationalization
		'/((?!api|_next|_vercel|.*\\..*).*)',
	],
}
