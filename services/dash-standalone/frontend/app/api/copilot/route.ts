import { NextRequest } from 'next/server'
import {
	CopilotRuntime,
	ExperimentalEmptyAdapter,
	copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'
import { HttpAgent } from '@ag-ui/client'

const DASH_BACKEND_URL =
	process.env.DASH_BACKEND_URL || 'http://localhost:9000'

const agents = {
	dash: new HttpAgent({
		url: `${DASH_BACKEND_URL}/api/dash-copilot`,
	}),
}

const runtime = new CopilotRuntime({ agents } as any)
const serviceAdapter = new ExperimentalEmptyAdapter()

export const POST = async (req: NextRequest) => {
	const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
		runtime,
		serviceAdapter,
		endpoint: '/api/copilot',
	})

	return handleRequest(req)
}
