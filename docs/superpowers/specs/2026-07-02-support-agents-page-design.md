# Design: Support Agents & Schedule page

Date: 2026-07-02
Status: Approved (design), pending spec review

## Purpose

CRUD UI for the `support_agents` table — the roster + weekly schedule that drives the
"Off-Shift Unassign" n8n automation. 15 minutes after an agent's shift ends, the n8n flow
unassigns that agent's still-open tickets (where AI drafted a reply but the agent never sent
it) so online agents can pick them up. **The n8n flow reads `support_agents` live every 15
minutes** — any edit saved here takes effect on the next tick, no deploy needed.

This page owns ONLY the `support_agents` table.

## Scope decisions

- **No global on/off switch.** The original ask mentioned a "turn off the whole system"
  button; it is dropped by decision. The dashboard cannot start/stop the n8n workflow itself,
  so a global flag would mislead. Use the per-agent `enabled` toggle only. (To stop
  everything, the flow is disabled in n8n directly.)
- **Editing via dialog, not inline cells.** Handoff suggested inline-editable weekday cells;
  we instead show the schedule read-only in the row (with an inline `enabled` Switch as a
  quick action) and edit through a shadcn `Dialog`. Editing 7 time-pairs inline overloads the
  row, and dialogs match the dashboard's existing style.
- **No Zustand slice.** This page has no date filters or persisted filter state.

## Database environment

The `support_agents` table lives in the **production** Postgres DB `ai_prioritization`
(schema `public`) — already created and seeded with 9 rows. Locally the dashboard resolves
to UAT (`VERCEL_ENV !== 'production'` → `UAT_DATABASE_URL` in `lib/utils/env.ts`); the
deployed dashboard resolves to PROD. Per the user, we work against PROD directly.

**Local testing protocol (prod-safety):**
- Temporarily point local to PROD (env override in `lib/utils/env.ts`, same pattern used
  before), test, then REVERT before commit.
- The n8n flow reads this table every 15 min, so edits affect live automation. Test only with
  a throwaway agent created with `enabled=false` (the automation skips disabled agents), then
  delete it. Do NOT modify the 9 seeded agents' schedules during testing.
- Evidence before assertion: after each write, re-read to confirm actual DB state.

## Data contract — table `support_agents`

```sql
CREATE TABLE support_agents (
    id            SERIAL PRIMARY KEY,
    name          TEXT        NOT NULL,          -- display name
    email         TEXT        NOT NULL,          -- e.g. sofia@levhaolam.com
    zoho_agent_id TEXT        NOT NULL UNIQUE,    -- Zoho Desk agent id; matches ticket assigneeId
    schedule      JSONB       NOT NULL DEFAULT '{}',
    enabled       BOOLEAN     NOT NULL DEFAULT true,
    timezone      TEXT        NOT NULL DEFAULT 'Asia/Jerusalem',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Do NOT** rename/drop columns, change `schedule` key names or time format, add a global
master-switch table/flag, or touch other tables. The n8n flow queries these columns by name.

### `schedule` JSONB format (automation parses this exactly)

Object keyed by lowercase weekday: `sun mon tue wed thu fri sat`.

- Working day: `{ "start": "HH:MM", "end": "HH:MM" }` — 24-hour, zero-padded (`"09:00"`, `"16:30"`).
- Day off: `null`.
- **Overnight shift** (crosses midnight): set `end` earlier than or equal to `start`
  (e.g. `20:00–04:00` = `{"start":"20:00","end":"04:00"}`; `16:00–00:00` =
  `{"start":"16:00","end":"00:00"}`). No extra flag — the automation infers next-day end.

Example (Sofia, nights Sun–Wed + Sat):
```json
{"sun":{"start":"20:00","end":"04:00"},"mon":{"start":"20:00","end":"04:00"},"tue":{"start":"20:00","end":"04:00"},"wed":{"start":"20:00","end":"04:00"},"thu":null,"fri":null,"sat":{"start":"20:00","end":"04:00"}}
```

### Validation rules

- `name`, `email`, `zoho_agent_id` required.
- `zoho_agent_id` unique — DB enforces; catch conflict and return a clear error
  ("agent with this Zoho id already exists").
- Times must be `HH:MM` 24h, or the day is `null` (Off). UI offers two time inputs + an Off
  checkbox per weekday.
- `enabled` is the on/off toggle. Disabled agents are skipped by the automation.
- `timezone` — all current agents are `Asia/Jerusalem`; keep the column (default it). A
  per-agent timezone editor is optional/low-priority; all schedule times are interpreted in
  this timezone.
- On update, set `updated_at = now()`.
- New agent whose `zoho_agent_id` is unknown may be saved with `enabled=false` and filled in
  later — the automation skips it while disabled.

## Architecture

### Route & navigation
- `app/[locale]/(analytics)/support-agents/page.tsx` — protected page rendering the client
  content component. `loading.tsx` for suspense.
- Add a nav entry in `components/app-sidebar.tsx`: title `common.supportAgents`, url
  `/support-agents`, icon `IconClockHour4` (or `IconCalendarClock`).

### Types — `lib/db/types.ts`
```ts
export type DaySchedule = { start: string; end: string } | null
export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type AgentSchedule = Partial<Record<Weekday, DaySchedule>>
export interface SupportAgent {
  id: number
  name: string
  email: string
  zohoAgentId: string
  schedule: AgentSchedule
  enabled: boolean
  timezone: string
  createdAt: string | Date
  updatedAt: string | Date
}
```

### Drizzle schema — `lib/db/schema.ts`
Add `supportAgents` pgTable mapping the columns above (`serial` id, `text`, `jsonb` schedule
typed as `AgentSchedule`, `boolean` enabled, `text` timezone, `timestamp withTimezone` for
created/updated). Definition is for type-safe queries only — the table already exists; we do
not run migrations against prod.

### Query layer — `lib/db/queries-support-agents.ts`
- `getSupportAgents(): Promise<SupportAgent[]>` — SELECT specific fields, ordered by name.
- Mutations can be inline in the action or thin helpers here (`insertSupportAgent`,
  `updateSupportAgentRow`, `deleteSupportAgentRow`).

### Server Actions — `lib/actions/support-agents-actions.ts`
All: `'use server'`, `requireAuth()` (session email), `createTimeoutPromise()`/`Promise.race`
30s timeout, return `{ success, data?, error? }`, perf logging, `revalidatePath('/support-agents')`.
- `fetchSupportAgents()` → `{ success, data: SupportAgent[] }`
- `createSupportAgent(input)` — validate, insert, handle unique conflict on `zoho_agent_id`.
- `updateSupportAgent(id, patch)` — validate, update, set `updated_at = now()`.
- `deleteSupportAgent(id)` — delete by id.
- `toggleSupportAgentEnabled(id, enabled)` — quick enabled flip (thin wrapper over update,
  also bumps `updated_at`).

### React Query — `lib/queries/support-agents-queries.ts`
- `useSupportAgents()` — `useQuery` with `...QUERY_CACHE_CONFIG`, key from factory.
- `useCreateSupportAgent`, `useUpdateSupportAgent`, `useDeleteSupportAgent`,
  `useToggleSupportAgent` — `useMutation`, invalidate `supportAgentsKeys.all` on success.
- Add `supportAgentsKeys` factory to `lib/queries/query-keys.ts`.

### UI — `components/support-agents-content.tsx` (client)
- Header: title + "Add agent" button. Overnight-shift hint (end ≤ start = crosses midnight).
- Table (one row per agent):
  - `name`, `email`, `zohoAgentId` (truncated w/ tooltip or title).
  - 7 weekday cells: `HH:MM–HH:MM` or "Off".
  - `enabled` — inline shadcn `Switch` (quick toggle → `useToggleSupportAgent`).
  - Actions: Edit (opens dialog), Delete (opens confirm dialog).
- `AgentFormDialog` (shared by Add + Edit): fields name, email, zoho_agent_id, per-weekday
  (two `time` inputs + Off checkbox), enabled Switch, optional timezone. Client-side validate,
  then Save → create/update mutation. Loading + error states.
- `DeleteAgentDialog`: confirm, then delete mutation.
- Sub-components as needed (`agent-schedule-cell.tsx`, `agent-form-dialog.tsx`) to keep files
  focused.

### i18n
Add a `supportAgents` namespace to `messages/en.json` and `messages/ru.json` (page title,
column headers, weekday labels, Off, Add/Edit/Delete/Save/Cancel, validation messages,
overnight hint, enabled on/off). Add `common.supportAgents` sidebar label to both.

## Error handling
- Actions return `{ success:false, error }` on failure; UI surfaces via toast/inline message.
- Unique `zoho_agent_id` conflict → specific, human-readable error.
- Timeout via existing `createTimeoutPromise()` pattern.
- Mutations optimistic-free (simple): on success invalidate + refetch; on error keep dialog
  open with the error shown.

## Testing / verification
- Local: point env to PROD (override → test → revert). Verify:
  1. Page loads and lists the 9 seeded agents with correct schedules.
  2. Create a throwaway agent `enabled=false` → re-read confirms row exists.
  3. Edit that agent's schedule/enabled → re-read confirms change + `updated_at` bumped.
  4. Toggle enabled inline → re-read confirms.
  5. Delete the throwaway agent → re-read confirms gone.
  6. Unique conflict: creating a second agent with an existing `zoho_agent_id` → clear error.
- Never mutate the 9 seeded agents during testing.
- `pnpm build` + `pnpm lint` clean before commit. Revert env override before commit.

## Out of scope
- Global automation on/off switch (dropped by decision).
- Editing the n8n flow itself.
- Any table other than `support_agents`.
- Per-agent timezone editor (optional; column defaulted, editor low priority).
