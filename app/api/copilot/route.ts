import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
	CopilotRuntime,
	ExperimentalEmptyAdapter,
	copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'
import { HttpAgent } from '@ag-ui/client'

const ALLOWED_DOMAIN =
	process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'levhaolam.com'
const DASH_BACKEND_URL =
	process.env.DASH_BACKEND_URL || 'http://localhost:9000'

/**
 * Verify user is authenticated and has valid email domain.
 * Reuses the same pattern as app/api/chat/route.ts
 */
async function verifyAuth(): Promise<{
	authorized: boolean
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
							// Ignore - cookies can only be set in Server Actions or Route Handlers
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
			return {
				authorized: false,
				error: 'Unauthorized: Invalid email domain',
			}
		}

		return { authorized: true }
	} catch (error) {
		console.error('Auth verification error:', error)
		return {
			authorized: false,
			error: 'Unauthorized: Authentication failed',
		}
	}
}

// CopilotKit runtime with HttpAgent pointing to the Dash AG-UI adapter
const agents = {
	dash: new HttpAgent({
		url: `${DASH_BACKEND_URL}/api/dash-copilot`,
	}),
}

const runtime = new CopilotRuntime({ agents } as any)
const serviceAdapter = new ExperimentalEmptyAdapter()

export const POST = async (req: NextRequest) => {
	// Verify authentication
	const auth = await verifyAuth()
	if (!auth.authorized) {
		return NextResponse.json(
			{ success: false, error: auth.error },
			{ status: 401 }
		)
	}

	const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
		runtime,
		serviceAdapter,
		endpoint: '/api/copilot',
	})

	return handleRequest(req)
}
