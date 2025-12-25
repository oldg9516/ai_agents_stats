import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Timeout for n8n webhook (25 seconds - leave buffer before Vercel/browser timeout)
const WEBHOOK_TIMEOUT = 25000

// Allowed email domain for access
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'levhaolam.com'

/**
 * Verify user is authenticated and has valid email domain
 */
async function verifyAuth(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
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
					setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
						try {
							cookiesToSet.forEach(({ name, value, options }) =>
								cookieStore.set(name, value, options)
							)
						} catch {
							// Ignore - cookies can only be set in Server Actions or Route Handlers
						}
					},
				},
			}
		)

		const { data: { user }, error } = await supabase.auth.getUser()

		if (error || !user) {
			return { authorized: false, error: 'Unauthorized: Please log in' }
		}

		const userEmail = user.email || ''
		if (!userEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
			return { authorized: false, error: 'Unauthorized: Invalid email domain' }
		}

		return { authorized: true }
	} catch (error) {
		console.error('Auth verification error:', error)
		return { authorized: false, error: 'Unauthorized: Authentication failed' }
	}
}

export async function POST(request: NextRequest) {
	// Verify authentication first
	const auth = await verifyAuth(request)
	if (!auth.authorized) {
		return NextResponse.json(
			{ success: false, error: auth.error },
			{ status: 401 }
		)
	}

	try {
		const body = await request.json()

		const webhookUrl = process.env.CHAT_WEBHOOK_URL
		const apiKey = process.env.N8N_X_API_KEY

		if (!webhookUrl) {
			return NextResponse.json(
				{ success: false, error: 'Webhook URL not configured' },
				{ status: 500 }
			)
		}

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		}

		if (apiKey) {
			headers['X-API-Key'] = apiKey
		}

		// Create AbortController with timeout
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT)

		let response: Response
		try {
			response = await fetch(webhookUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
				signal: controller.signal,
			})
		} catch (err) {
			clearTimeout(timeoutId)
			// If timeout, return polling signal so client starts polling DB
			if (err instanceof Error && err.name === 'AbortError') {
				return NextResponse.json({
					success: true,
					polling: true,
					message: 'Request is being processed. Response will be saved to database.'
				})
			}
			throw err
		} finally {
			clearTimeout(timeoutId)
		}

		if (!response.ok) {
			return NextResponse.json(
				{ success: false, error: `Upstream error: ${response.status}` },
				{ status: response.status }
			)
		}

		const contentType = response.headers.get('content-type') || ''

		// For streaming responses, pass through
		if (contentType.includes('text/event-stream')) {
			const stream = response.body
			if (!stream) {
				return NextResponse.json(
					{ success: false, error: 'No response stream' },
					{ status: 500 }
				)
			}

			return new NextResponse(stream, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
				},
			})
		}

		// Get response as text first
		const text = await response.text()

		// Check if it's n8n NDJSON streaming format (multiple JSON objects per line)
		if (text.includes('{"type":"') && text.includes('\n')) {
			// Parse NDJSON and extract content from "item" messages
			const lines = text.split('\n').filter(line => line.trim())
			let content = ''
			let hasError = false
			let errorContent = ''

			for (const line of lines) {
				try {
					const obj = JSON.parse(line)
					if (obj.type === 'item' && obj.content) {
						content += obj.content
					}
					if (obj.type === 'error') {
						hasError = true
						errorContent = obj.content || 'Unknown error in n8n workflow'
					}
				} catch {
					// Skip invalid JSON lines
				}
			}

			if (hasError) {
				return NextResponse.json({
					success: false,
					error: errorContent
				})
			}

			return NextResponse.json({
				success: true,
				response: {
					content: content || 'No response',
					content_type: 'text',
					metadata: {}
				}
			})
		}

		// Try to parse as regular JSON
		try {
			const data = JSON.parse(text)
			return NextResponse.json(data)
		} catch {
			// If not valid JSON, wrap text in a response object
			return NextResponse.json({
				success: true,
				response: {
					content: text,
					content_type: 'text',
					metadata: {}
				}
			})
		}

	} catch (error) {
		console.error('Chat API error:', error)
		return NextResponse.json(
			{ success: false, error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
