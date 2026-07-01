'use server'

/**
 * Support Agents Server Actions
 *
 * CRUD for the `support_agents` table (Off-Shift Unassign automation roster).
 * All actions require auth and are wrapped in a 30s timeout. Writes affect the
 * live automation — the n8n flow reads this table every 15 minutes.
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import {
	deleteSupportAgentRow,
	getSupportAgents,
	insertSupportAgent,
	updateSupportAgentRow,
} from '@/lib/db/queries-support-agents'
import { REQUEST_TIMEOUT } from '@/lib/queries/query-config'
import { normalizeSchedule, validateAgentInput } from '@/lib/utils/support-agents-validation'
import type {
	CreateSupportAgentInput,
	SupportAgent,
	UpdateSupportAgentInput,
} from '@/lib/db/types'

interface ActionResult<T = void> {
	success: boolean
	data?: T
	error?: string
}

function createTimeoutPromise(ms: number, operationName: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(() => reject(new Error(`${operationName} timed out after ${ms}ms`)), ms)
	)
}

function getErrorMessage(error: unknown): string {
	// Postgres unique_violation on zoho_agent_id
	if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505') {
		return 'An agent with this Zoho agent id already exists'
	}
	if (error instanceof Error) return error.message
	return 'Unknown error'
}

async function requireAuth(): Promise<void> {
	const session = await auth()
	if (!session?.user?.email) throw new Error('Unauthorized')
}

export async function fetchSupportAgents(): Promise<ActionResult<SupportAgent[]>> {
	const startTime = Date.now()
	try {
		await requireAuth()
		const data = await Promise.race([
			getSupportAgents(),
			createTimeoutPromise(REQUEST_TIMEOUT, 'Support agents fetch'),
		])
		console.log(`[SupportAgents] Fetched ${data.length} agents in ${Date.now() - startTime}ms`)
		return { success: true, data }
	} catch (error) {
		console.error('[SupportAgents] fetch error:', error)
		return { success: false, error: getErrorMessage(error) }
	}
}

export async function createSupportAgent(
	input: CreateSupportAgentInput
): Promise<ActionResult<SupportAgent>> {
	try {
		await requireAuth()
		const validationError = validateAgentInput(input)
		if (validationError) return { success: false, error: validationError }

		const data = await Promise.race([
			insertSupportAgent({ ...input, schedule: normalizeSchedule(input.schedule) }),
			createTimeoutPromise(REQUEST_TIMEOUT, 'Support agent create'),
		])
		revalidatePath('/support-agents')
		return { success: true, data }
	} catch (error) {
		console.error('[SupportAgents] create error:', error)
		return { success: false, error: getErrorMessage(error) }
	}
}

export async function updateSupportAgent(
	id: number,
	input: UpdateSupportAgentInput
): Promise<ActionResult<SupportAgent>> {
	try {
		await requireAuth()
		// Validate only when the fields that have validation rules are present.
		if (input.name !== undefined || input.email !== undefined || input.zohoAgentId !== undefined || input.schedule !== undefined) {
			const validationError = validateAgentInput({
				name: input.name ?? 'x',
				email: input.email ?? 'x',
				zohoAgentId: input.zohoAgentId ?? 'x',
				schedule: input.schedule ?? {},
			})
			if (validationError) return { success: false, error: validationError }
		}

		const patch: UpdateSupportAgentInput = { ...input }
		if (input.schedule !== undefined) patch.schedule = normalizeSchedule(input.schedule)

		const data = await Promise.race([
			updateSupportAgentRow(id, patch),
			createTimeoutPromise(REQUEST_TIMEOUT, 'Support agent update'),
		])
		if (!data) return { success: false, error: 'Agent not found' }
		revalidatePath('/support-agents')
		return { success: true, data }
	} catch (error) {
		console.error('[SupportAgents] update error:', error)
		return { success: false, error: getErrorMessage(error) }
	}
}

export async function toggleSupportAgentEnabled(
	id: number,
	enabled: boolean
): Promise<ActionResult<SupportAgent>> {
	return updateSupportAgent(id, { enabled })
}

export async function deleteSupportAgent(id: number): Promise<ActionResult> {
	try {
		await requireAuth()
		await Promise.race([
			deleteSupportAgentRow(id),
			createTimeoutPromise(REQUEST_TIMEOUT, 'Support agent delete'),
		])
		revalidatePath('/support-agents')
		return { success: true }
	} catch (error) {
		console.error('[SupportAgents] delete error:', error)
		return { success: false, error: getErrorMessage(error) }
	}
}
