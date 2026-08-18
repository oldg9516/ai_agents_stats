# IT request — ticket status events (On Hold, reopen, closing agent)

**Status**: draft for Irina to file
**Date**: 2026-08-18
**Unlocks**: On Hold Duration, per-agent Reopen Rate, per-episode Resolution Time
(`TZ_SLA_Metrics_IT.pdf` §1.1, §4, §5)

## Which dashboard each item feeds

The two asks below land on two different pages, and they are bundled into one request only
because the same pipeline and the same team deliver both.

| Ask | Page | What it changes there |
|---|---|---|
| Ticket status + owner events | **Agent SLA stats** (`/agents-stats`) | Adds On Hold Duration and its 72h KPI column; upgrades Reopen Rate from the current last-replier approximation to the spec's `prev_closing_agent_id`; moves Resolution Time from ticket level to per episode |
| `First subscription date` on every ticket | **AI Sentiment** (`/sentiment`) | Fills the Tenure × Sentiment heatmap, where "no subscription date" is currently the largest bucket |

Nothing about the status events touches the sentiment page, and nothing about the
subscription date touches the SLA page — if IT prefers, the two can be filed separately.

## Why the current data is not enough

Our database receives a *snapshot* of the Zoho ticket on every message
(`support_dialogs.data->payload`) and that snapshot is overwritten. It carries the ticket's
current `status`, a single `onholdTime` and a single `closedTime` — never the sequence of
changes. Measured on production: only 358 of 15 344 tickets in 60 days carry any
`onholdTime`, and a hold status is visible on ~45 tickets, because a hold is only captured
if a message happens to arrive while the ticket sits on hold.

Every metric below needs the transitions themselves: when the ticket entered a status, when
it left, and who owned it at that moment.

## What we need delivered

One row per ticket event, appended — never updated in place.

| Field | Type | Notes |
|---|---|---|
| `ticket_id` | text | Zoho internal id, the long one (matches what we already store) |
| `ticket_number` | text | Human-readable number, for manual cross-checks |
| `event_ts` | timestamptz | **UTC, ISO 8601 with milliseconds.** No business-hours adjustment |
| `event_kind` | text | `status` or `owner` |
| `from_status` / `to_status` | text | Zoho `previousValue` → `updatedValue` (status events) |
| `from_status_type` / `to_status_type` | text | Zoho's own grouping: `Open` / `On Hold` / `Closed` |
| `from_owner_agent_id` / `to_owner_agent_id` | text | Zoho agent ids (owner events) |
| `actor_agent_id` | text | Who made the change; null for system/customer-driven events |
| `actor_type` | text | `Agent`, `Workflow`, `Macro`, `System`, `Contact` |
| `source` | text | Zoho's event source; `IncomingResponse` marks a customer-driven reopen |

`status_type` matters more than the status name: the portal uses 11 different custom hold
statuses (`Awaiting INTERNAL`, `Duplicate Account/subscription`, `Customer
dispute/Chargeback`, `Awaiting CUSTOMER`, `On Hold`, `On Hold GENERAL`, `Address
Verification`, `Wait`, `Pending`, `On Hold - Rivki`, `On hold - Payment error`), and
`Possible Retention` is typed **Open**, not On Hold. With `status_type` delivered we never
maintain that list, and a new custom status works on day one.

## Delivery

- **Live**: a Zoho workflow rule on status change and on owner change, posting to an n8n
  webhook that appends the row. The mechanism already exists — Zoho runs
  `Send Webhook with Thread Function` against n8n today, so this is an additional rule
  rather than a new integration.
- **Backfill**: 2–3 months of history, so the Resolution Time target can be calibrated from
  real medians as the spec (§3) requires. Zoho's ticket History endpoint returns exactly
  these events, including `previousValue`/`updatedValue`, the actor and `Case Owner`
  transitions — verified against live tickets.
- **Idempotency**: unique on (`ticket_id`, `event_ts`, `event_kind`, `to_status`), so retries
  and overlapping backfill runs cannot duplicate rows.

## What we deliberately do NOT want

Zoho's own computed metrics (`firstResponseTime`, `resolutionTime`, `stagingData`,
`agentsHandled`). They are measured in **business hours** and exclude the time a ticket sat
Closed: on ticket `550547000425594253` Zoho reports 117 hours where the calendar gap is 364.
The spec asks for 24/7 calendar time, so those fields would contradict it. Send raw events;
we do the arithmetic.

## Bonus ask, same team

`First subscription date` currently reaches us on ~32% of requests (1441 of 4521 over 30
days). It drives the Tenure × Sentiment heatmap on the AI Sentiment dashboard, where the
"no subscription date" bucket is presently the largest one. Delivering it on every ticket
would close that gap.

## Acceptance criteria

For any ticket we pick, the event stream must let us reconstruct, without guessing:

1. Every hold period — entry timestamp, exit timestamp, and the owner during it.
2. Every `Closed → Open` cycle, with customer-driven reopens distinguishable from an agent
   reopening the ticket.
3. The agent who set `Closed`, for each close.

Cross-check: ticket `550547000428817413` must show created → closed by one agent → reopened
by the customer → closed → reopened → closed, with the two reopens marked as customer-driven.
