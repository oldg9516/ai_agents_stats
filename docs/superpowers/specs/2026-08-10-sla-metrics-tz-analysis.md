# Support SLA metrics spec — what we can and cannot compute

**Date**: 2026-08-10
**Source**: `TZ_SLA_Metrics_IT.pdf` (Irina, Customer Support Operations), August 2026
**Page**: `/agents-stats` — Agent SLA stats

The spec asks for 4 KPI metrics per agent, all measured per "episode" (обращение) inside a
ticket, where a new episode starts on every `Closed → Open` transition.

| Metric | Target | Credited to | Status |
|---|---|---|---|
| FRT | 24h | agent who replied first | **Shipped** |
| Resolution Time | calibrate from actuals | agent who closed | **Shipped, approximate** |
| On Hold Duration | 72h per hold period | hold owner | **Not possible** |
| Reopen Rate | ≤5% within 7 days | agent who closed the previous episode | **Not per agent** |

## What the database holds

n8n writes a Zoho ticket payload onto every `support_dialogs` row (`data->payload`) and
refreshes it afterwards — 8643 of 9931 closed snapshots carry a `closedTime` later than the
message itself. Useful fields: `status`, `statusType`, `createdTime`, `closedTime`,
`onholdTime`, `assigneeId`, `modifiedBy`, `resolution`, `slaId`.

`support_agents.zoho_agent_id` maps Zoho IDs to emails (9 of the 16 assignee IDs seen in 60
days resolve to our agents).

**It is a snapshot, not a history.** There is no status-transition log anywhere in the
database: `status_log` tracks the AI pipeline's own stages (`AI processing`, `Reply is
ready`, …) and never mentions Open/Closed/On Hold; `support_tickets.status` holds only
`Client replied` / `Agent replied`. That single fact is what blocks the episode model.

## Consequences per metric

**Resolution Time** — computed as `closedTime − createdTime` for tickets closed inside the
period, credited to the agent who sent the last reply before the close. Zoho never tells us
who pressed Closed; this rule covers 89% of closed tickets versus 67% for the ticket
assignee, and the two agree in 97% of cases where both are known. Ticket-level, not
per-episode. 30-day sample: 3465 closed tickets, per-agent medians 12–52h — these are the
actuals the spec (§3) wants the business to calibrate `Required_RT` from.

**On Hold Duration** — not computable. Over 60 days only 389 tickets carry an `onholdTime`
and 45 ever showed a hold status, and it is one timestamp rather than periods. The spec
needs every hold period separately with its owner at the time.

**Reopen Rate** — reopens are visible (418 incoming messages arrived at Closed tickets over
60 days, ≈2%) but cannot be credited: `prev_closing_agent_id` requires a history of closes.
A team-level rate is feasible; a per-agent KPI is not.

## Open question: what counts as an episode

The spec defines an episode as a `Closed → Open` cycle. In the data that is rare — 418
reopens against ~18,000 incoming messages, so 97–98% of tickets would hold exactly one
episode and FRT would again be measured once per ticket. That is the version Irina rejected
on 2026-08-08 in favour of counting every customer message. Both readings are defensible;
the numbers differ; Irina decides. Until she answers, FRT stays per customer message.

## To unblock On Hold and Reopen Rate

Start recording status transitions — an n8n change, not a dashboard one: a new
`ticket_status_events` table (`ticket_id`, `from_status`, `to_status`, `ts`,
`actor_agent_id`) fed by Zoho status-change events, plus a backfill. Note that Zoho API
access is out of scope per Gleb (2026-08-10) — we work from the database only, so this
depends on what the existing n8n flows can be made to persist.

## Implementation notes

- SLA targets live in `constants/sla-targets.ts` with `fulfillmentPercent()`; FRT KPI % is
  derived in the UI rather than in SQL.
- In `get_agent_stats` v7 the close-date filter runs *before* the snapshot grouping. Doing
  it the other way round (group all dialog rows, filter later) pushed the function past its
  30s timeout; with the filter first the whole call takes ~5.5s.
- The Resolution window filters on the close date, while every FRT column filters on the
  reply date. Both are correct for their metric, but the columns answer slightly different
  questions about "the period".
