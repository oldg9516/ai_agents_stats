import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDashBackendUrl, getDashApiKey } from '@/lib/utils/env'

/**
 * Verify auth and return user email.
 */
async function verifyAuthWithEmail(): Promise<{
	authorized: boolean
	email?: string
	error?: string
}> {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return { authorized: false, error: 'Unauthorized: Please log in' }
		}
		return { authorized: true, email: session.user.email }
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
	const authResult = await verifyAuthWithEmail()
	if (!authResult.authorized) {
		return NextResponse.json({ error: authResult.error }, { status: 401 })
	}

	const headers: Record<string, string> = { 'X-User-Email': authResult.email! }
	if (getDashApiKey()) headers['X-API-Key'] = getDashApiKey()

	const resp = await fetch(`${getDashBackendUrl()}/api/sessions`, { headers })
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
	const authResult = await verifyAuthWithEmail()
	if (!authResult.authorized) {
		return NextResponse.json({ error: authResult.error }, { status: 401 })
	}

	const body = await request.json().catch(() => ({}))
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-User-Email': authResult.email!,
	}
	if (getDashApiKey()) headers['X-API-Key'] = getDashApiKey()

	const resp = await fetch(`${getDashBackendUrl()}/api/sessions`, {
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
