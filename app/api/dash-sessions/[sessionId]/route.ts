import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDashBackendUrl, getDashApiKey } from '@/lib/utils/env'

async function verifyAuthWithEmail(): Promise<{
	authorized: boolean
	email?: string
	error?: string
}> {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return { authorized: false, error: 'Unauthorized' }
		}
		return { authorized: true, email: session.user.email }
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
	const authResult = await verifyAuthWithEmail()
	if (!authResult.authorized)
		return NextResponse.json({ error: authResult.error }, { status: 401 })

	const { sessionId } = await params
	if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId))
		return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })

	const resp = await fetch(`${getDashBackendUrl()}/api/sessions/${sessionId}/messages`, {
		headers: dashHeaders(authResult.email!),
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
	const authResult = await verifyAuthWithEmail()
	if (!authResult.authorized)
		return NextResponse.json({ error: authResult.error }, { status: 401 })

	const { sessionId } = await params
	if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId))
		return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
	const body = await request.json()

	const resp = await fetch(`${getDashBackendUrl()}/api/sessions/${sessionId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...dashHeaders(authResult.email!) },
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
	const authResult = await verifyAuthWithEmail()
	if (!authResult.authorized)
		return NextResponse.json({ error: authResult.error }, { status: 401 })

	const { sessionId } = await params
	if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId))
		return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })

	const resp = await fetch(`${getDashBackendUrl()}/api/sessions/${sessionId}`, {
		method: 'DELETE',
		headers: dashHeaders(authResult.email!),
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
