import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const locale = searchParams.get('locale') ?? 'ru'

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

      // Redirect to intended destination
      const redirectUrl = next.startsWith('/') ? next : `/${locale}/dashboard`
      return NextResponse.redirect(new URL(redirectUrl, origin))
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(
    new URL(`/${locale}/login?error=auth_failed`, origin)
  )
}
