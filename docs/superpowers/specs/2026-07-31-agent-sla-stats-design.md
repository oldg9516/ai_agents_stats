# Agent SLA stats — design

**Date**: 2026-07-31
**Requested by**: Irina (support lead), via Gleb
**Page**: `/agents-stats` → renamed to "Agent SLA stats" / «SLA агентов»

## Problem

Irina uses the agent stats table daily but only needs the response-time columns. She asked to:

1. Rename the tab to "Agent SLA stats".
2. Drop the columns she never uses: AI Reviewed, Changed, Critical Errors, Unnecessary Changes %, AI Efficiency %.
3. Rename `Avg Response Time` → `Avg FRT`, `Median Response Time` → `Median FRT`, keep `P90 Response Time`, and explain FRT as "время от получения обращения клиента до первого ответа агентом".

Investigation showed the rename alone would mislabel the data:

- The three response-time columns are computed as `ai_human_comparison.human_reply_date − ai_human_comparison.created_at`, i.e. **from AI draft creation to the agent's reply** — not from the customer's request.
- They only cover tickets that have an `ai_human_comparison` record (~30% of tickets). Agents without AI comparisons (samantha, david, rivki) show `0`.
- The Total row averages per-agent averages and takes a median of medians — unweighted and, for percentiles, not a valid aggregate.

Decision: implement the metric Irina actually named, rather than relabel the existing one.

## FRT definition (agreed)

Per **ticket**: time from the customer's first incoming message to the **first** outgoing agent reply after it, credited to the agent who sent that reply.

- Unit: one number per ticket, so an agent's FRT count is lower than their Answered Tickets count (which counts threads/обращения).
- Date window applies to the **reply** date, consistent with how Answered Tickets already filters.
- The window is applied *after* choosing the ticket's first reply — never "first reply inside the window".
- `api@levhaolam.com` stays excluded, as everywhere else on the page.
- `samantha@levhaolam.com` (AI auto-reply account, median ≈18 min, no AI comparisons, absent from `support_agents`) counts as a normal responder and gets her own row: if the bot answered the customer in 18 minutes, the ticket's honest FRT is 18 minutes. She is added to the default agent filter so her SLA is visible.
- Version/category filters keep working: FRT tickets are restricted to the same `eligible_threads` universe as the rest of the table (verified: 3774 of 3781 tickets in a 30-day window are in `support_threads_data`).

Rejected alternatives: per-incoming-message reply time (a different metric — good candidate for Irina's upcoming 4 metrics, but it is not *first* response time); ignoring the bot's reply so the human's later reply counts as "first" (inflates numbers — the customer had an answer already).

## Changes

### Database — `SQL-RPC/get-agent-stats.sql` (v4)

- New CTE `ticket_first_in`: `MIN(date)` of `direction='in'` per ticket, full history (no date filter).
- New CTE `ticket_first_response`: `DISTINCT ON (ticket_id)` first `direction='out'` row after `first_in_date`, excluding `p_excluded_email`, restricted to `eligible_threads`.
- New CTE `frt_per_agent`: window filter on the reply date, then per email `frt_count`, `avg_frt`, `median_frt`, `p90_frt` (hours, 1 decimal).
- New parameter `p_agents text[] DEFAULT NULL` — affects **only** the TOTAL row, so the agent dropdown still receives every agent.
- New returned columns `frt_count`, `avg_frt`, `median_frt`, `p90_frt`.
- New `email = 'TOTAL'` row with exact aggregates over the raw ticket set of the selected agents (percentiles cannot be derived client-side from per-agent aggregates). The old columns in that row are aggregated correctly too, so no returned number is misleading.
- Existing columns are kept, not removed: they leave the UI but stay available for the 4 metrics Irina is preparing and for cross-checking.
- The old 6-argument signature is dropped explicitly — otherwise the added parameter creates an overload with a stale return shape.

### Application

- `lib/db/types.ts` — `AgentStatsRow` gains `frtCount`, `avgFrt`, `medianFrt`, `p90Frt`.
- `lib/actions/agents-stats-actions.ts` — passes `p_agents`, splits the TOTAL row out, returns `{ agents, totals }`.
- `lib/queries/agents-stats-queries.ts` — `calculateAgentStatsTotals` deleted, totals come from the server, `agents` joins the query key.
- `lib/store/slices/agents-stats-slice.ts` — `samantha@levhaolam.com` added to `DEFAULT_AGENT_EMAILS` as `AI_AUTO_REPLY_EMAIL`.
- `lib/store/index.ts` — persist version 16 → 17 with a targeted migration that adds the bot to an existing persisted agent list instead of resetting every filter.

### UI

- `components/tables/agents-stats-table.tsx` — five columns: Email, Answered Tickets, Avg FRT, Median FRT, P90 Response Time. Removed columns take `getEfficiencyColor`/`getUnnecessaryColor` and their Total cells with them. Default sort: Avg FRT descending (slowest first). `frtCount = 0` renders «—», not `0`.
- `components/loading/agents-stats-skeleton.tsx` — 7 skeleton columns → 5.
- `app/[locale]/(analytics)/agents-stats/page.tsx` — metadata title/description.
- `messages/en.json`, `messages/ru.json` — `common.agentsStats`, page title/description, `table.avgFrt`/`table.medianFrt`, FRT tooltips; unused table and tooltip keys removed (modal keys stay).
- Row click keeps opening the Agent Changes modal — Irina did not ask to remove it.

## Verification

| Step | Check |
|---|---|
| Types | `./node_modules/.bin/tsc --noEmit` clean (5 pre-existing errors are the baseline; `rtk tsc` gives false positives) |
| Lint | `pnpm lint` |
| UAT | Deploy RPC, call it, compare against hand-written SQL |
| PROD | Deploy only after Gleb's explicit OK; then verify sofia = 25.6 / 11.3 / 56.8 over 440 tickets for a 30-day window |
| UI | Local dev points at UAT, whose data ends 2026-03-17 — check with a date range in the past |

## Expected impact

Displayed numbers drop for every agent (roughly 20–45% on avg/median) and the FRT base is smaller than Answered Tickets. Irina needs a short written explanation of the new formula once the numbers are confirmed.
