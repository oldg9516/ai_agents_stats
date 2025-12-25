import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
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

// Check if path should skip middleware entirely
function shouldSkipMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
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

  // Create response for cookie handling
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Get session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Get locale from path or default
  const locale = pathname.match(/^\/(ru|en)/)?.[1] || 'ru'

  // No session - redirect to login
  if (!user || error) {
    const loginUrl = new URL(`/${locale}/login`, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Validate email domain
  const allowedDomain =
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'levhaolam.com'
  const userEmail = user.email || ''

  if (!userEmail.endsWith(`@${allowedDomain}`)) {
    // Sign out the user with wrong domain
    await supabase.auth.signOut()

    const unauthorizedUrl = new URL(`/${locale}/unauthorized`, request.url)
    return NextResponse.redirect(unauthorizedUrl)
  }

  // User is authenticated and has valid domain - run intl middleware
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
