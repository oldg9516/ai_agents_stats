import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ALLOWED_DOMAIN =
	process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'levhaolam.com'
const DASH_BACKEND_URL =
	process.env.DASH_BACKEND_URL || 'http://localhost:9000'
const DASH_API_KEY = process.env.DASH_API_KEY || ''

/**
 * Verify auth and return user email.
 */
async function verifyAuthWithEmail(): Promise<{
	authorized: boolean
	email?: string
	error?: string
}> {
	try {
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
							// Ignore
						}
					},
				},
			}
		)

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser()

		if (error || !user) {
			return { authorized: false, error: 'Unauthorized: Please log in' }
		}

		const userEmail = user.email || ''
		if (!userEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
			return { authorized: false, error: 'Unauthorized: Invalid email domain' }
		}

		return { authorized: true, email: userEmail }
	} catch {
		return { authorized: false, error: 'Unauthorized: Authentication failed' }
	}
}

/**
 * Proxy requests to Dash backend /api/sessions.
 * GET /api/dash-sessions → GET /api/sessions
 * POST /api/dash-sessions → POST /api/sessions
 */
export async function GET() {
	const auth = await verifyAuthWithEmail()
	if (!auth.authorized) {
		return NextResponse.json({ error: auth.error }, { status: 401 })
	}

	const headers: Record<string, string> = { 'X-User-Email': auth.email! }
	if (DASH_API_KEY) headers['X-API-Key'] = DASH_API_KEY

	const resp = await fetch(`${DASH_BACKEND_URL}/api/sessions`, { headers })
	const text = await resp.text()
	if (!resp.ok) {
		console.error('Dash backend error:', resp.status, text)
		return NextResponse.json({ error: 'Backend request failed' }, { status: resp.status })
	}
	try {
		return NextResponse.json(JSON.parse(text), { status: resp.status })
	} catch {
		console.error('Dash backend non-JSON response:', text)
		return NextResponse.json({ error: 'Invalid backend response' }, { status: 502 })
	}
}

export async function POST(request: NextRequest) {
	const auth = await verifyAuthWithEmail()
	if (!auth.authorized) {
		return NextResponse.json({ error: auth.error }, { status: 401 })
	}

	const body = await request.json().catch(() => ({}))
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-User-Email': auth.email!,
	}
	if (DASH_API_KEY) headers['X-API-Key'] = DASH_API_KEY

	const resp = await fetch(`${DASH_BACKEND_URL}/api/sessions`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	})
	const text = await resp.text()
	if (!resp.ok) {
		console.error('Dash backend error:', resp.status, text)
		return NextResponse.json({ error: 'Backend request failed' }, { status: resp.status })
	}
	try {
		return NextResponse.json(JSON.parse(text), { status: resp.status })
	} catch {
		console.error('Dash backend non-JSON response:', text)
		return NextResponse.json({ error: 'Invalid backend response' }, { status: 502 })
	}
}
