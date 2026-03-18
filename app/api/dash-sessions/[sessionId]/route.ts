import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getDashBackendUrl, getDashApiKey } from '@/lib/utils/env'

const ALLOWED_DOMAIN =
	process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'levhaolam.com'

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
		if (error || !user) return { authorized: false, error: 'Unauthorized' }
		const userEmail = user.email || ''
		if (!userEmail.endsWith(`@${ALLOWED_DOMAIN}`))
			return { authorized: false, error: 'Unauthorized: Invalid email domain' }
		return { authorized: true, email: userEmail }
	} catch {
		return { authorized: false, error: 'Unauthorized' }
	}
}

function dashHeaders(email: string): Record<string, string> {
	const h: Record<string, string> = { 'X-User-Email': email }
	if (getDashApiKey()) h['X-API-Key'] = getDashApiKey()
	return h
}

/**
 * GET /api/dash-sessions/[sessionId] → get session messages
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ sessionId: string }> }
) {
	const auth = await verifyAuthWithEmail()
	if (!auth.authorized)
		return NextResponse.json({ error: auth.error }, { status: 401 })

	const { sessionId } = await params
	if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId))
		return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })

	const resp = await fetch(`${getDashBackendUrl()}/api/sessions/${sessionId}/messages`, {
		headers: dashHeaders(auth.email!),
	})
	const text = await resp.text()
	if (!resp.ok) {
		console.error('Dash backend error:', resp.status, text)
		return NextResponse.json({ error: 'Backend request failed' }, { status: resp.status })
	}
	try {
		return NextResponse.json(JSON.parse(text), { status: resp.status })
	} catch {
		console.error('Dash backend non-JSON response for GET messages:', sessionId)
		return NextResponse.json({ error: 'Invalid backend response' }, { status: 502 })
	}
}

/**
 * PATCH /api/dash-sessions/[sessionId] → rename session
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ sessionId: string }> }
) {
	const auth = await verifyAuthWithEmail()
	if (!auth.authorized)
		return NextResponse.json({ error: auth.error }, { status: 401 })

	const { sessionId } = await params
	if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId))
		return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
	const body = await request.json()

	const resp = await fetch(`${getDashBackendUrl()}/api/sessions/${sessionId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...dashHeaders(auth.email!) },
		body: JSON.stringify(body),
	})
	try {
		const data = await resp.json()
		if (!resp.ok) {
			console.error('Dash backend error:', resp.status, data)
			return NextResponse.json({ error: 'Backend request failed' }, { status: resp.status })
		}
		return NextResponse.json(data, { status: resp.status })
	} catch {
		console.error('Dash backend non-JSON response for PATCH session:', sessionId)
		return NextResponse.json({ error: 'Invalid backend response' }, { status: 502 })
	}
}

/**
 * DELETE /api/dash-sessions/[sessionId] → delete session
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ sessionId: string }> }
) {
	const auth = await verifyAuthWithEmail()
	if (!auth.authorized)
		return NextResponse.json({ error: auth.error }, { status: 401 })

	const { sessionId } = await params
	if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId))
		return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })

	const resp = await fetch(`${getDashBackendUrl()}/api/sessions/${sessionId}`, {
		method: 'DELETE',
		headers: dashHeaders(auth.email!),
	})
	try {
		const data = await resp.json()
		if (!resp.ok) {
			console.error('Dash backend error:', resp.status, data)
			return NextResponse.json({ error: 'Backend request failed' }, { status: resp.status })
		}
		return NextResponse.json(data, { status: resp.status })
	} catch {
		console.error('Dash backend non-JSON response for DELETE session:', sessionId)
		return NextResponse.json({ error: 'Invalid backend response' }, { status: 502 })
	}
}
