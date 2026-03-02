import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/** Validate redirect path to prevent open redirect attacks */
function getSafeRedirectPath(next: string | null, locale: string): string {
  const fallback = `/${locale}/dashboard`
  if (!next) return fallback

  // Must start with / and must NOT start with // (protocol-relative URL)
  if (!next.startsWith('/') || next.startsWith('//')) return fallback

  // Decode and re-check to prevent encoded bypasses like /%2f%2f
  try {
    const decoded = decodeURIComponent(next)
    if (decoded.startsWith('//') || decoded.includes('://')) return fallback
  } catch {
    return fallback
  }

  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const locale = searchParams.get('locale') ?? 'ru'
  const redirectPath = getSafeRedirectPath(searchParams.get('next'), locale)

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(
            cookiesToSet: {
              name: string
              value: string
              options: CookieOptions
            }[]
          ) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Handle cookies in Server Components
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Validate email domain
      const allowedDomain =
        process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'levhaolam.com'
      const userEmail = data.session.user.email || ''

      if (!userEmail.endsWith(`@${allowedDomain}`)) {
        // Sign out immediately
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL(`/${locale}/unauthorized`, origin))
      }

      // Redirect to intended destination (validated above)
      return NextResponse.redirect(new URL(redirectPath, origin))
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(
    new URL(`/${locale}/login?error=auth_failed`, origin)
  )
}
