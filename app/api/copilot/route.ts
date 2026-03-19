import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
	CopilotRuntime,
	ExperimentalEmptyAdapter,
	copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'
import { HttpAgent } from '@ag-ui/client'

import { getDashBackendUrl, getDashApiKey } from '@/lib/utils/env'

/**
 * Verify user is authenticated.
 */
async function verifyAuth(): Promise<{
	authorized: boolean
	error?: string
}> {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return { authorized: false, error: 'Unauthorized: Please log in' }
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
		url: `${getDashBackendUrl()}/api/dash-copilot`,
		...(getDashApiKey() && { headers: { 'X-API-Key': getDashApiKey() } }),
	}),
}

const runtime = new CopilotRuntime({ agents } as any)
const serviceAdapter = new ExperimentalEmptyAdapter()

export const POST = async (req: NextRequest) => {
	// Verify authentication
	const authResult = await verifyAuth()
	if (!authResult.authorized) {
		return NextResponse.json(
			{ success: false, error: authResult.error },
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
