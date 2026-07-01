import 'server-only'

import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { supportAgents } from '@/lib/db/schema'
import type {
	AgentSchedule,
	CreateSupportAgentInput,
	SupportAgent,
	UpdateSupportAgentInput,
} from '@/lib/db/types'

function mapRow(row: typeof supportAgents.$inferSelect): SupportAgent {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		zohoAgentId: row.zohoAgentId,
		schedule: (row.schedule ?? {}) as AgentSchedule,
		enabled: row.enabled,
		timezone: row.timezone,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}
}

export async function getSupportAgents(): Promise<SupportAgent[]> {
	const rows = await db
		.select()
		.from(supportAgents)
		.orderBy(asc(supportAgents.name))
	return rows.map(mapRow)
}

export async function insertSupportAgent(
	input: CreateSupportAgentInput
): Promise<SupportAgent> {
	const [row] = await db
		.insert(supportAgents)
		.values({
			name: input.name.trim(),
			email: input.email.trim(),
			zohoAgentId: input.zohoAgentId.trim(),
			schedule: input.schedule,
			enabled: input.enabled,
			timezone: input.timezone?.trim() || 'Asia/Jerusalem',
		})
		.returning()
	return mapRow(row)
}

export async function updateSupportAgentRow(
	id: number,
	input: UpdateSupportAgentInput
): Promise<SupportAgent | null> {
	const patch: Partial<typeof supportAgents.$inferInsert> = {
		updatedAt: new Date(),
	}
	if (input.name !== undefined) patch.name = input.name.trim()
	if (input.email !== undefined) patch.email = input.email.trim()
	if (input.zohoAgentId !== undefined) patch.zohoAgentId = input.zohoAgentId.trim()
	if (input.schedule !== undefined) patch.schedule = input.schedule
	if (input.enabled !== undefined) patch.enabled = input.enabled
	if (input.timezone !== undefined) patch.timezone = input.timezone.trim()

	const [row] = await db
		.update(supportAgents)
		.set(patch)
		.where(eq(supportAgents.id, id))
		.returning()
	return row ? mapRow(row) : null
}

export async function deleteSupportAgentRow(id: number): Promise<void> {
	await db.delete(supportAgents).where(eq(supportAgents.id, id))
}
