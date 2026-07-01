# Support Agents & Schedule Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CRUD dashboard page for the `support_agents` table (roster + weekly schedule that drives the n8n Off-Shift Unassign automation): list, add, edit, delete agents, edit weekly hours, and per-agent enable/disable.

**Architecture:** Follows the dashboard's established pattern — Client component → React Query hook → Server Action (auth + 30s timeout) → Drizzle query → Postgres. Reads/writes the `support_agents` table directly in the production `ai_prioritization` DB. Editing is done through a shadcn `Dialog`; the row shows a read-only schedule plus an inline `enabled` Switch. No Zustand slice (no filters/dates). No global on/off switch.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Drizzle ORM (node-postgres), TanStack React Query, shadcn/ui, next-intl, sonner (toasts).

---

## Important context for the engineer

- **No test runner exists** in this repo (`pnpm test` is not configured). Verification gates in this plan are: `pnpm lint`, `pnpm build`, and **manual read-after-write verification against the DB**. There is no unit-test step; do not invent one.
- **DB environment.** Locally the app resolves to UAT (`lib/utils/env.ts` → `getPrefix()` returns `UAT` unless `VERCEL_ENV==='production'`). The `support_agents` table lives in **PROD** `ai_prioritization`. To test locally you must temporarily force PROD, then **revert before committing** (see Task 12). This mirrors the previously-used override pattern.
- **Prod safety.** The n8n flow reads `support_agents` every 15 minutes. Test ONLY with a throwaway agent created with `enabled=false` (automation skips disabled agents); delete it after. **Never modify the 9 seeded agents' rows during testing.**
- **Do NOT** run Drizzle migrations against prod. The table already exists; the Drizzle definition is for type-safe queries only.
- Start by creating a working branch (repo default branch is `main`):
  ```bash
  git checkout -b feat/support-agents-page
  ```

## File Structure

**Create:**
- `lib/utils/support-agents-validation.ts` — pure validation helpers (time format, agent input). Reused by both the server action and the client dialog.
- `constants/support-agents.ts` — weekday key ordering.
- `lib/db/queries-support-agents.ts` — Drizzle read/write query functions (`server-only`).
- `lib/actions/support-agents-actions.ts` — Server Actions (fetch/create/update/delete/toggle).
- `lib/queries/support-agents-queries.ts` — React Query hooks.
- `components/support-agents-content.tsx` — main client page content (table + wiring).
- `components/support-agents/agent-schedule-cell.tsx` — read-only weekday cell.
- `components/support-agents/agent-form-dialog.tsx` — Add/Edit dialog with form.
- `components/support-agents/delete-agent-dialog.tsx` — delete confirm dialog.
- `app/[locale]/(analytics)/support-agents/page.tsx` — route.
- `app/[locale]/(analytics)/support-agents/loading.tsx` — loading fallback.

**Modify:**
- `lib/db/types.ts` — add `DaySchedule`, `Weekday`, `AgentSchedule`, `SupportAgent`, and input types.
- `lib/db/schema.ts` — add `supportAgents` pgTable.
- `lib/queries/query-keys.ts` — add `supportAgentsKeys`.
- `components/app-sidebar.tsx` — add nav entry + icon import.
- `messages/en.json` and `messages/ru.json` — add `supportAgents` namespace + `common.supportAgents`.

---

## Task 1: Types

**Files:**
- Modify: `lib/db/types.ts` (append at end of file)

- [ ] **Step 1: Add the support-agents types**

Append to `lib/db/types.ts`:

```typescript
// ---------------------------------------------------------------------------
// Support Agents (Off-Shift Unassign automation roster)
// ---------------------------------------------------------------------------

/** A single working day: start/end in "HH:MM" 24h, or null for a day off. */
export type DaySchedule = { start: string; end: string } | null

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

/** Weekly schedule keyed by lowercase weekday. Missing key === day off. */
export type AgentSchedule = Partial<Record<Weekday, DaySchedule>>

export interface SupportAgent {
	id: number
	name: string
	email: string
	zohoAgentId: string
	schedule: AgentSchedule
	enabled: boolean
	timezone: string
	createdAt: Date | string
	updatedAt: Date | string
}

/** Payload for creating a new agent. */
export interface CreateSupportAgentInput {
	name: string
	email: string
	zohoAgentId: string
	schedule: AgentSchedule
	enabled: boolean
	timezone?: string
}

/** Payload for updating an agent (all fields except id optional). */
export type UpdateSupportAgentInput = Partial<Omit<CreateSupportAgentInput, never>>
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no new errors referencing `types.ts`). Pre-existing unrelated errors may appear — confirm none are in `lib/db/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/db/types.ts
git commit -m "feat(support-agents): add schedule + agent types"
```

---

## Task 2: Weekday constant

**Files:**
- Create: `constants/support-agents.ts`

- [ ] **Step 1: Create the weekday ordering constant**

```typescript
import type { Weekday } from '@/lib/db/types'

/**
 * Weekday keys in display order (Sunday first — Israel work week).
 * These exact lowercase keys are what the n8n automation parses in `schedule`.
 */
export const WEEKDAY_KEYS: readonly Weekday[] = [
	'sun',
	'mon',
	'tue',
	'wed',
	'thu',
	'fri',
	'sat',
] as const

/** Default timezone for new agents (all current agents use this). */
export const DEFAULT_AGENT_TIMEZONE = 'Asia/Jerusalem'
```

- [ ] **Step 2: Commit**

```bash
git add constants/support-agents.ts
git commit -m "feat(support-agents): add weekday ordering constant"
```

---

## Task 3: Validation helpers

**Files:**
- Create: `lib/utils/support-agents-validation.ts`

- [ ] **Step 1: Create the validation module**

```typescript
import type { AgentSchedule, CreateSupportAgentInput, Weekday } from '@/lib/db/types'
import { WEEKDAY_KEYS } from '@/constants/support-agents'

/** True for a zero-padded 24h time like "09:00" or "16:30". */
export function isValidTime(value: string): boolean {
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/**
 * Validate a create/update payload. Returns an error message string, or null
 * if valid. Pure — safe to call on client and server.
 */
export function validateAgentInput(
	input: Pick<CreateSupportAgentInput, 'name' | 'email' | 'zohoAgentId' | 'schedule'>
): string | null {
	if (!input.name?.trim()) return 'Name is required'
	if (!input.email?.trim()) return 'Email is required'
	if (!input.zohoAgentId?.trim()) return 'Zoho agent id is required'

	for (const day of WEEKDAY_KEYS) {
		const slot = input.schedule[day]
		if (slot == null) continue // day off — allowed
		if (!isValidTime(slot.start) || !isValidTime(slot.end)) {
			return `Invalid time for ${day} (use HH:MM 24h)`
		}
	}
	return null
}

/**
 * Normalize a schedule: drop keys whose value is null so the stored JSONB only
 * contains working days (matches the automation's "missing === off" reading).
 * Kept explicit so overnight shifts (end <= start) are preserved untouched.
 */
export function normalizeSchedule(schedule: AgentSchedule): AgentSchedule {
	const out: AgentSchedule = {}
	for (const day of WEEKDAY_KEYS) {
		const slot = schedule[day]
		if (slot != null) out[day as Weekday] = { start: slot.start, end: slot.end }
	}
	return out
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors in `support-agents-validation.ts`).

- [ ] **Step 3: Commit**

```bash
git add lib/utils/support-agents-validation.ts
git commit -m "feat(support-agents): add input/time validation helpers"
```

---

## Task 4: Drizzle schema

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add the `supportAgents` table (do NOT migrate — table already exists)**

Add near the other `pgTable` definitions (after `supportThreadsData`), and add `AgentSchedule` to the type import at the top of the file if not already imported. At top of file add:

```typescript
import type { AgentSchedule } from './types'
```

Then add the table:

```typescript
/**
 * support_agents — roster + weekly schedule for the Off-Shift Unassign
 * automation. The n8n flow reads this table live every 15 minutes. Already
 * created + seeded in prod; defined here only for type-safe queries.
 */
export const supportAgents = pgTable('support_agents', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	zohoAgentId: text('zoho_agent_id').notNull().unique(),
	schedule: jsonb('schedule').$type<AgentSchedule>().notNull().default({}),
	enabled: boolean('enabled').notNull().default(true),
	timezone: text('timezone').notNull().default('Asia/Jerusalem'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors in `schema.ts`).

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(support-agents): add supportAgents drizzle table"
```

---

## Task 5: Query layer

**Files:**
- Create: `lib/db/queries-support-agents.ts`

- [ ] **Step 1: Create read/write query functions**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/db/queries-support-agents.ts
git commit -m "feat(support-agents): add drizzle query layer"
```

---

## Task 6: Server Actions

**Files:**
- Create: `lib/actions/support-agents-actions.ts`

- [ ] **Step 1: Create the Server Actions**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/support-agents-actions.ts
git commit -m "feat(support-agents): add CRUD server actions"
```

---

## Task 7: Query keys + React Query hooks

**Files:**
- Modify: `lib/queries/query-keys.ts`
- Create: `lib/queries/support-agents-queries.ts`

- [ ] **Step 1: Add query keys**

Append to `lib/queries/query-keys.ts` (before the combined `queryKeys` object):

```typescript
/**
 * Support Agents query keys
 */
export const supportAgentsKeys = {
	all: ['support-agents'] as const,
	list: () => [...supportAgentsKeys.all, 'list'] as const,
}
```

- [ ] **Step 2: Create the hooks**

`lib/queries/support-agents-queries.ts`:

```typescript
'use client'

/**
 * React Query hooks for the Support Agents CRUD page.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	createSupportAgent,
	deleteSupportAgent,
	fetchSupportAgents,
	toggleSupportAgentEnabled,
	updateSupportAgent,
} from '@/lib/actions/support-agents-actions'
import { QUERY_CACHE_CONFIG } from '@/lib/queries/query-config'
import { supportAgentsKeys } from '@/lib/queries/query-keys'
import type {
	CreateSupportAgentInput,
	SupportAgent,
	UpdateSupportAgentInput,
} from '@/lib/db/types'

export function useSupportAgents() {
	const query = useQuery({
		queryKey: supportAgentsKeys.list(),
		queryFn: async (): Promise<SupportAgent[]> => {
			const result = await fetchSupportAgents()
			if (!result.success || !result.data) {
				throw new Error(result.error || 'Failed to fetch support agents')
			}
			return result.data
		},
		...QUERY_CACHE_CONFIG,
		staleTime: 60 * 1000, // 1 min — edits should show up quickly
	})

	return {
		agents: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	}
}

export function useCreateSupportAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (input: CreateSupportAgentInput) => {
			const result = await createSupportAgent(input)
			if (!result.success) throw new Error(result.error || 'Failed to create agent')
			return result.data
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAgentsKeys.all }),
	})
}

export function useUpdateSupportAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, input }: { id: number; input: UpdateSupportAgentInput }) => {
			const result = await updateSupportAgent(id, input)
			if (!result.success) throw new Error(result.error || 'Failed to update agent')
			return result.data
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAgentsKeys.all }),
	})
}

export function useToggleSupportAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
			const result = await toggleSupportAgentEnabled(id, enabled)
			if (!result.success) throw new Error(result.error || 'Failed to toggle agent')
			return result.data
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAgentsKeys.all }),
	})
}

export function useDeleteSupportAgent() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: number) => {
			const result = await deleteSupportAgent(id)
			if (!result.success) throw new Error(result.error || 'Failed to delete agent')
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAgentsKeys.all }),
	})
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/query-keys.ts lib/queries/support-agents-queries.ts
git commit -m "feat(support-agents): add query keys + react-query hooks"
```

---

## Task 8: Schedule cell component

**Files:**
- Create: `components/support-agents/agent-schedule-cell.tsx`

- [ ] **Step 1: Create the read-only weekday cell**

```typescript
'use client'

import type { DaySchedule } from '@/lib/db/types'

/**
 * Read-only display of one weekday's schedule: "09:00–16:30" or "Off".
 * `offLabel` is passed from the translated parent so this stays i18n-agnostic.
 */
export function AgentScheduleCell({
	slot,
	offLabel,
}: {
	slot: DaySchedule | undefined
	offLabel: string
}) {
	if (slot == null) {
		return <span className='text-muted-foreground text-xs'>{offLabel}</span>
	}
	return (
		<span className='text-xs tabular-nums whitespace-nowrap'>
			{slot.start}–{slot.end}
		</span>
	)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/support-agents/agent-schedule-cell.tsx
git commit -m "feat(support-agents): add read-only schedule cell"
```

---

## Task 9: Agent form dialog (Add / Edit)

**Files:**
- Create: `components/support-agents/agent-form-dialog.tsx`

Uses existing UI primitives: `Dialog`, `Input`, `Label`, `Button`, `Switch`, `Checkbox` from `components/ui/*`, and `toast` from `sonner`.

- [ ] **Step 1: Create the dialog**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { WEEKDAY_KEYS, DEFAULT_AGENT_TIMEZONE } from '@/constants/support-agents'
import { validateAgentInput } from '@/lib/utils/support-agents-validation'
import {
	useCreateSupportAgent,
	useUpdateSupportAgent,
} from '@/lib/queries/support-agents-queries'
import type { AgentSchedule, SupportAgent, Weekday } from '@/lib/db/types'

type FormDay = { off: boolean; start: string; end: string }
type FormSchedule = Record<Weekday, FormDay>

function emptyForm(): FormSchedule {
	return WEEKDAY_KEYS.reduce((acc, day) => {
		acc[day] = { off: true, start: '09:00', end: '17:00' }
		return acc
	}, {} as FormSchedule)
}

function scheduleToForm(schedule: AgentSchedule): FormSchedule {
	return WEEKDAY_KEYS.reduce((acc, day) => {
		const slot = schedule[day]
		acc[day] = slot
			? { off: false, start: slot.start, end: slot.end }
			: { off: true, start: '09:00', end: '17:00' }
		return acc
	}, {} as FormSchedule)
}

function formToSchedule(form: FormSchedule): AgentSchedule {
	const out: AgentSchedule = {}
	for (const day of WEEKDAY_KEYS) {
		const d = form[day]
		out[day] = d.off ? null : { start: d.start, end: d.end }
	}
	return out
}

export function AgentFormDialog({
	mode,
	agent,
	open,
	onOpenChange,
}: {
	mode: 'add' | 'edit'
	agent?: SupportAgent
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const t = useTranslations('supportAgents')
	const createMutation = useCreateSupportAgent()
	const updateMutation = useUpdateSupportAgent()

	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [zohoAgentId, setZohoAgentId] = useState('')
	const [enabled, setEnabled] = useState(true)
	const [schedule, setSchedule] = useState<FormSchedule>(emptyForm())

	// Reset the form whenever the dialog opens.
	useEffect(() => {
		if (!open) return
		if (mode === 'edit' && agent) {
			setName(agent.name)
			setEmail(agent.email)
			setZohoAgentId(agent.zohoAgentId)
			setEnabled(agent.enabled)
			setSchedule(scheduleToForm(agent.schedule))
		} else {
			setName('')
			setEmail('')
			setZohoAgentId('')
			setEnabled(true)
			setSchedule(emptyForm())
		}
	}, [open, mode, agent])

	const isPending = createMutation.isPending || updateMutation.isPending

	function updateDay(day: Weekday, patch: Partial<FormDay>) {
		setSchedule(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }))
	}

	async function handleSave() {
		const scheduleObj = formToSchedule(schedule)
		const payload = { name, email, zohoAgentId, schedule: scheduleObj }
		const validationError = validateAgentInput(payload)
		if (validationError) {
			toast.error(validationError)
			return
		}

		try {
			if (mode === 'add') {
				await createMutation.mutateAsync({
					...payload,
					enabled,
					timezone: DEFAULT_AGENT_TIMEZONE,
				})
				toast.success(t('toastCreated'))
			} else if (agent) {
				await updateMutation.mutateAsync({
					id: agent.id,
					input: { ...payload, enabled },
				})
				toast.success(t('toastUpdated'))
			}
			onOpenChange(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('toastError'))
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>{mode === 'add' ? t('addTitle') : t('editTitle')}</DialogTitle>
					<DialogDescription>{t('overnightHint')}</DialogDescription>
				</DialogHeader>

				<div className='grid gap-4 py-2'>
					<div className='grid gap-2'>
						<Label htmlFor='agent-name'>{t('name')}</Label>
						<Input id='agent-name' value={name} onChange={e => setName(e.target.value)} />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='agent-email'>{t('email')}</Label>
						<Input id='agent-email' type='email' value={email} onChange={e => setEmail(e.target.value)} />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='agent-zoho'>{t('zohoAgentId')}</Label>
						<Input id='agent-zoho' value={zohoAgentId} onChange={e => setZohoAgentId(e.target.value)} />
						<p className='text-muted-foreground text-xs'>{t('zohoHint')}</p>
					</div>

					<div className='grid gap-2'>
						<Label>{t('schedule')}</Label>
						<div className='flex flex-col gap-2'>
							{WEEKDAY_KEYS.map(day => {
								const d = schedule[day]
								return (
									<div key={day} className='flex items-center gap-2'>
										<span className='w-10 text-sm font-medium'>{t(`weekdays.${day}`)}</span>
										<label className='flex items-center gap-1 text-xs'>
											<Checkbox
												checked={d.off}
												onCheckedChange={checked => updateDay(day, { off: checked === true })}
											/>
											{t('off')}
										</label>
										<Input
											type='time'
											className='w-28'
											value={d.start}
											disabled={d.off}
											onChange={e => updateDay(day, { start: e.target.value })}
										/>
										<span className='text-muted-foreground'>–</span>
										<Input
											type='time'
											className='w-28'
											value={d.end}
											disabled={d.off}
											onChange={e => updateDay(day, { end: e.target.value })}
										/>
									</div>
								)
							})}
						</div>
					</div>

					<div className='flex items-center gap-2'>
						<Switch id='agent-enabled' checked={enabled} onCheckedChange={setEnabled} />
						<Label htmlFor='agent-enabled'>{t('enabled')}</Label>
					</div>
				</div>

				<DialogFooter>
					<Button variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
						{t('cancel')}
					</Button>
					<Button onClick={handleSave} disabled={isPending}>
						{isPending ? t('saving') : t('save')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
```

> Note: `type='time'` inputs emit `HH:MM` 24h, matching the storage format exactly. Overnight shifts are entered as `end <= start` — no special handling needed.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (Confirm `Checkbox`, `Switch` prop signatures match — `onCheckedChange` receives `boolean | 'indeterminate'`; the code handles it via `checked === true`.)

- [ ] **Step 3: Commit**

```bash
git add components/support-agents/agent-form-dialog.tsx
git commit -m "feat(support-agents): add add/edit form dialog"
```

---

## Task 10: Delete confirm dialog

**Files:**
- Create: `components/support-agents/delete-agent-dialog.tsx`

- [ ] **Step 1: Create the confirm dialog**

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteSupportAgent } from '@/lib/queries/support-agents-queries'
import type { SupportAgent } from '@/lib/db/types'

export function DeleteAgentDialog({
	agent,
	open,
	onOpenChange,
}: {
	agent: SupportAgent | null
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const t = useTranslations('supportAgents')
	const deleteMutation = useDeleteSupportAgent()

	async function handleDelete() {
		if (!agent) return
		try {
			await deleteMutation.mutateAsync(agent.id)
			toast.success(t('toastDeleted'))
			onOpenChange(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('toastError'))
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{t('deleteTitle')}</DialogTitle>
					<DialogDescription>
						{t('deleteConfirm', { name: agent?.name ?? '' })}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant='outline' onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
						{t('cancel')}
					</Button>
					<Button variant='destructive' onClick={handleDelete} disabled={deleteMutation.isPending}>
						{deleteMutation.isPending ? t('deleting') : t('delete')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/support-agents/delete-agent-dialog.tsx
git commit -m "feat(support-agents): add delete confirm dialog"
```

---

## Task 11: Main content component

**Files:**
- Create: `components/support-agents-content.tsx`

- [ ] **Step 1: Create the page content (table + wiring)**

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { AgentScheduleCell } from '@/components/support-agents/agent-schedule-cell'
import { AgentFormDialog } from '@/components/support-agents/agent-form-dialog'
import { DeleteAgentDialog } from '@/components/support-agents/delete-agent-dialog'
import { WEEKDAY_KEYS } from '@/constants/support-agents'
import {
	useSupportAgents,
	useToggleSupportAgent,
} from '@/lib/queries/support-agents-queries'
import type { SupportAgent } from '@/lib/db/types'

export function SupportAgentsContent() {
	const t = useTranslations('supportAgents')
	const { agents, isLoading, error } = useSupportAgents()
	const toggleMutation = useToggleSupportAgent()

	const [formOpen, setFormOpen] = useState(false)
	const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
	const [editing, setEditing] = useState<SupportAgent | undefined>(undefined)
	const [deleteTarget, setDeleteTarget] = useState<SupportAgent | null>(null)
	const [deleteOpen, setDeleteOpen] = useState(false)

	function openAdd() {
		setFormMode('add')
		setEditing(undefined)
		setFormOpen(true)
	}

	function openEdit(agent: SupportAgent) {
		setFormMode('edit')
		setEditing(agent)
		setFormOpen(true)
	}

	function openDelete(agent: SupportAgent) {
		setDeleteTarget(agent)
		setDeleteOpen(true)
	}

	async function handleToggle(agent: SupportAgent, enabled: boolean) {
		try {
			await toggleMutation.mutateAsync({ id: agent.id, enabled })
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('toastError'))
		}
	}

	return (
		<div className='flex flex-col gap-4 p-4 md:p-6'>
			<div className='flex items-center justify-between gap-2'>
				<div>
					<h1 className='text-2xl font-semibold'>{t('title')}</h1>
					<p className='text-muted-foreground text-sm'>{t('subtitle')}</p>
				</div>
				<Button onClick={openAdd}>
					<IconPlus className='mr-1 size-4' />
					{t('addAgent')}
				</Button>
			</div>

			<p className='text-muted-foreground text-xs'>{t('overnightHint')}</p>

			{error ? (
				<div className='text-destructive text-sm'>{error.message}</div>
			) : isLoading ? (
				<Skeleton className='h-64 w-full' />
			) : (
				<div className='overflow-x-auto rounded-md border'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('name')}</TableHead>
								<TableHead>{t('email')}</TableHead>
								{WEEKDAY_KEYS.map(day => (
									<TableHead key={day} className='text-center'>
										{t(`weekdays.${day}`)}
									</TableHead>
								))}
								<TableHead className='text-center'>{t('enabled')}</TableHead>
								<TableHead className='text-right'>{t('actions')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{agents.length === 0 ? (
								<TableRow>
									<TableCell colSpan={WEEKDAY_KEYS.length + 4} className='text-muted-foreground text-center'>
										{t('empty')}
									</TableCell>
								</TableRow>
							) : (
								agents.map(agent => (
									<TableRow key={agent.id}>
										<TableCell className='font-medium'>{agent.name}</TableCell>
										<TableCell className='text-muted-foreground text-sm'>{agent.email}</TableCell>
										{WEEKDAY_KEYS.map(day => (
											<TableCell key={day} className='text-center'>
												<AgentScheduleCell slot={agent.schedule[day]} offLabel={t('off')} />
											</TableCell>
										))}
										<TableCell className='text-center'>
											<Switch
												checked={agent.enabled}
												onCheckedChange={checked => handleToggle(agent, checked)}
											/>
										</TableCell>
										<TableCell className='text-right'>
											<div className='flex justify-end gap-1'>
												<Button variant='ghost' size='icon' onClick={() => openEdit(agent)} aria-label={t('edit')}>
													<IconPencil className='size-4' />
												</Button>
												<Button variant='ghost' size='icon' onClick={() => openDelete(agent)} aria-label={t('delete')}>
													<IconTrash className='size-4' />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			<AgentFormDialog mode={formMode} agent={editing} open={formOpen} onOpenChange={setFormOpen} />
			<DeleteAgentDialog agent={deleteTarget} open={deleteOpen} onOpenChange={setDeleteOpen} />
		</div>
	)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (Confirm `Skeleton` is exported from `components/ui/skeleton` — it is used by `automation-overview-content.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add components/support-agents-content.tsx
git commit -m "feat(support-agents): add main content table component"
```

---

## Task 12: Route + loading + sidebar nav

**Files:**
- Create: `app/[locale]/(analytics)/support-agents/page.tsx`
- Create: `app/[locale]/(analytics)/support-agents/loading.tsx`
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Create the page**

`app/[locale]/(analytics)/support-agents/page.tsx`:

```typescript
import { Suspense } from 'react'
import { SupportAgentsContent } from '@/components/support-agents-content'
import SpinnerComponent from '@/components/SpinnerComponent'

/**
 * Support Agents & Schedule page — CRUD for the `support_agents` table that
 * drives the Off-Shift Unassign n8n automation.
 */
export default function SupportAgentsPage() {
	return (
		<Suspense fallback={<SpinnerComponent />}>
			<SupportAgentsContent />
		</Suspense>
	)
}
```

- [ ] **Step 2: Create the loading fallback**

`app/[locale]/(analytics)/support-agents/loading.tsx`:

```typescript
import SpinnerComponent from '@/components/SpinnerComponent'

export default function Loading() {
	return <SpinnerComponent />
}
```

- [ ] **Step 3: Add sidebar nav entry**

In `components/app-sidebar.tsx`: add `IconClockHour4` to the `@tabler/icons-react` import block, and add a nav item to `data.navMain` (place it right after the `agentsStats` entry):

```typescript
			{
				title: t('supportAgents'),
				url: '/support-agents',
				icon: IconClockHour4,
			},
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (`t('supportAgents')` will resolve once Task 13 adds the key; TypeScript does not type-check message keys, so this compiles now.)

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(analytics)/support-agents" components/app-sidebar.tsx
git commit -m "feat(support-agents): add route, loading, sidebar nav"
```

---

## Task 13: i18n messages

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Step 1: Add `common.supportAgents` to both files**

In `messages/en.json`, inside the existing `"common"` object, add:
```json
"supportAgents": "Support Agents"
```
In `messages/ru.json`, inside `"common"`:
```json
"supportAgents": "Агенты поддержки"
```

- [ ] **Step 2: Add the `supportAgents` namespace to `messages/en.json`**

Add a top-level `"supportAgents"` object:

```json
"supportAgents": {
	"title": "Support Agents & Schedule",
	"subtitle": "Weekly working hours that drive the off-shift ticket unassign automation.",
	"addAgent": "Add agent",
	"name": "Name",
	"email": "Email",
	"zohoAgentId": "Zoho agent id",
	"zohoHint": "Numeric Zoho Desk agent id (matches ticket assigneeId). If unknown, save with the agent disabled and fill it in later.",
	"schedule": "Weekly schedule",
	"enabled": "Enabled",
	"actions": "Actions",
	"edit": "Edit",
	"delete": "Delete",
	"deleting": "Deleting…",
	"save": "Save",
	"saving": "Saving…",
	"cancel": "Cancel",
	"off": "Off",
	"empty": "No support agents yet.",
	"addTitle": "Add support agent",
	"editTitle": "Edit support agent",
	"deleteTitle": "Delete agent",
	"deleteConfirm": "Delete {name}? This removes them from the automation roster.",
	"overnightHint": "Overnight shifts: enter an end time earlier than or equal to the start (e.g. 20:00–04:00). Times are in Asia/Jerusalem.",
	"toastCreated": "Agent created",
	"toastUpdated": "Agent updated",
	"toastDeleted": "Agent deleted",
	"toastError": "Something went wrong",
	"weekdays": {
		"sun": "Sun",
		"mon": "Mon",
		"tue": "Tue",
		"wed": "Wed",
		"thu": "Thu",
		"fri": "Fri",
		"sat": "Sat"
	}
}
```

- [ ] **Step 3: Add the `supportAgents` namespace to `messages/ru.json`**

```json
"supportAgents": {
	"title": "Агенты поддержки и расписание",
	"subtitle": "Недельные рабочие часы, на основе которых работает автоматизация снятия тикетов после смены.",
	"addAgent": "Добавить агента",
	"name": "Имя",
	"email": "Email",
	"zohoAgentId": "Zoho agent id",
	"zohoHint": "Числовой id агента в Zoho Desk (совпадает с assigneeId тикета). Если неизвестен — сохраните агента выключенным и заполните позже.",
	"schedule": "Недельное расписание",
	"enabled": "Активен",
	"actions": "Действия",
	"edit": "Изменить",
	"delete": "Удалить",
	"deleting": "Удаление…",
	"save": "Сохранить",
	"saving": "Сохранение…",
	"cancel": "Отмена",
	"off": "Выходной",
	"empty": "Агентов поддержки пока нет.",
	"addTitle": "Добавить агента поддержки",
	"editTitle": "Изменить агента поддержки",
	"deleteTitle": "Удалить агента",
	"deleteConfirm": "Удалить {name}? Агент будет убран из ростера автоматизации.",
	"overnightHint": "Ночные смены: укажите время окончания раньше или равным началу (например 20:00–04:00). Время в зоне Asia/Jerusalem.",
	"toastCreated": "Агент создан",
	"toastUpdated": "Агент обновлён",
	"toastDeleted": "Агент удалён",
	"toastError": "Что-то пошло не так",
	"weekdays": {
		"sun": "Вс",
		"mon": "Пн",
		"tue": "Вт",
		"wed": "Ср",
		"thu": "Чт",
		"fri": "Пт",
		"sat": "Сб"
	}
}
```

- [ ] **Step 4: Verify JSON is valid**

Run: `pnpm exec tsc --noEmit && node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); console.log('json ok')"`
Expected: prints `json ok`.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat(support-agents): add i18n messages (en + ru)"
```

---

## Task 14: Build + manual verification against PROD, then finalize

**Files:**
- Temporarily modify (then REVERT): `lib/utils/env.ts`

- [ ] **Step 1: Lint + production build**

Run: `pnpm lint && pnpm build`
Expected: lint passes for new files; build succeeds. Fix any errors before proceeding. (If a stale `.next` causes a codegen TS error, `rm -rf .next` and rebuild — a known issue in this repo.)

- [ ] **Step 2: Temporarily point local dev at PROD**

Edit `lib/utils/env.ts` `getPrefix()` to force PROD (same override pattern used previously):

```typescript
function getPrefix(): 'PROD' | 'UAT' {
	return 'PROD' // TEMP: verifying support-agents CRUD against prod — REVERT before commit
}
```

Then start dev: `pnpm dev`

- [ ] **Step 3: Manually verify the flow (evidence before assertion)**

At `http://localhost:3000/support-agents` (log in with an @levhaolam.com account):
1. **List:** the 9 seeded agents render with correct schedules and enabled states.
2. **Create:** add a throwaway agent — name `ZZ Test`, email `zz.test@levhaolam.com`, a unique fake `zoho_agent_id` (e.g. `999999999999999999`), **enabled = OFF**, a couple of working days. Save → row appears.
   - Confirm in DB: `SELECT id,name,enabled,schedule FROM support_agents WHERE zoho_agent_id='999999999999999999';`
3. **Edit:** change the test agent's schedule (incl. one overnight day e.g. 20:00–04:00) → save → re-query confirms `schedule` JSON is exactly right and `updated_at` advanced.
4. **Inline toggle:** flip the test agent's Switch → re-query confirms `enabled` changed.
5. **Unique conflict:** try adding another agent with `zoho_agent_id='999999999999999999'` → friendly error toast, no row created.
6. **Delete:** delete the test agent → row gone (`SELECT ... ` returns 0 rows).

**Do not touch the 9 seeded agents.** If any step fails, fix and re-verify — do not claim success without the DB read confirming it.

- [ ] **Step 4: REVERT the env override**

Restore `lib/utils/env.ts` to its original `getPrefix()`:

```typescript
function getPrefix(): 'PROD' | 'UAT' {
	return process.env.VERCEL_ENV === 'production' ? 'PROD' : 'UAT'
}
```

Confirm no diff remains: `git diff lib/utils/env.ts` → empty.

- [ ] **Step 5: Final build check + commit any fixes**

Run: `pnpm lint && pnpm build`
Expected: PASS.

```bash
git add -A
git commit -m "chore(support-agents): finalize page after prod verification"
```

- [ ] **Step 6: Report status to the user**

Summarize what was verified (with the DB evidence from Step 3) and confirm the env override was reverted. Ask before pushing / opening a PR (per project git policy).

---

## Self-Review Notes (author)

- **Spec coverage:** list (Task 11), edit+save hours (Tasks 9/6/5), add (Task 9), delete (Task 10), per-agent enable/disable inline + in form (Tasks 11/9), no global switch (explicitly omitted), schedule JSONB format incl. overnight + day-off null (Tasks 3/9 `formToSchedule`), `updated_at=now()` on update (Task 5), unique `zoho_agent_id` conflict handling (Task 6), timezone column defaulted (Tasks 4/9), i18n both locales (Task 13), nav (Task 12), prod DB + safe testing (Task 14). All covered.
- **Type consistency:** `SupportAgent.zohoAgentId` (string), `schedule: AgentSchedule`, hooks use `{id, input}` / `{id, enabled}` shapes consistently across Tasks 6/7/9/11. `validateAgentInput` signature matches all call sites. `WEEKDAY_KEYS` reused everywhere.
- **No placeholders:** every code step is complete.
- **Adaptation:** no test runner in repo → TDD replaced by `tsc`/`lint`/`build` + manual read-after-write verification, stated up front.
