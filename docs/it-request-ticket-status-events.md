# IT request — On Hold measurement

**Status**: draft for Irina / Ilya
**Date**: 2026-08-19 (second revision)
**Page it feeds**: **Agent SLA stats** (`/agents-stats`) — On Hold Duration, exact Reopen
attribution (`TZ_SLA_Metrics_IT.pdf` §4, §5)

## Correction to the previous revision

The earlier draft claimed the stored payload is refreshed after the last message on 94.6% of
closed tickets, and proposed that Zoho simply persist a few fields for us to read from it.
**That was a measurement error.** The comparison was against the ticket's *last* message,
and tickets are usually closed within minutes of the final reply, so the closure fell inside
the same capture.

Measured properly: the payload's own `modifiedTime` sits a median of **0.1 minutes** after
the message date (p90 5.4 minutes), and only 1% of rows are more than 24h apart. The payload
is captured once, while the message is processed, and never refreshed — which matches what
Ilya says: the record is only updated when the AI changes the department.

Consequence: **no field Zoho persists can reach us through the existing payload** if the
change happens after the last message. A hold that starts after the final reply is invisible
to us for ever.

## Why On Hold cannot be derived from what we store today

1. `onholdTime` is cleared on exit — all 150 tickets currently in a hold status carry it,
   zero of the 22 591 Open/Closed tickets do.
2. A snapshot catches a ticket mid-hold on 2.2% of tickets (506 of 22 741 over 90 days),
   because we only look when a message arrives.
3. A duration needs two timestamps. Overwriting "the current status" somewhere gives one.

## The hold statuses in play

Irina's list has 12 names. Nine have reached our database at least once, three never have:

| Status | Tickets seen | statusType |
|---|---|---|
| Awaiting INTERNAL | 369 | On Hold |
| Duplicate Account/subscription | 137 | On Hold |
| Customer dispute/Chargeback | 114 | On Hold |
| Awaiting CUSTOMER | 107 | On Hold |
| On Hold GENERAL | 37 | On Hold |
| Address Verification | 22 | On Hold |
| Pending | 3 | On Hold |
| On Hold - Rivki | 2 | On Hold |
| On hold - Payment error | 1 | On Hold |
| (NSD) Wait | never seen | — |
| On hold - PAST Box Availability? | never seen | — |
| Delay my Shipment | never seen | — |

Those counts come only from the 2.2% of tickets we happen to catch mid-hold, so real hold
volume is higher — that gap is the whole point of this request.

Ask for Zoho's `statusType` alongside the status name rather than a hardcoded list of names:
three names on the list have never appeared, and names like `On Hold - Rivki` show the list
grows ad hoc. With `statusType` a new hold status works on day one.

## Two workable shapes — Ilya picks whichever is cheaper for them

### Shape 1 — they keep a current mirror, we keep the history

One row per ticket in our database, upserted whenever the Zoho status changes:
`ticket_id`, `status`, `status_type`, `assignee_agent_id`, `changed_at` (UTC).

No event logic, no history, no calculations on their side — a single upsert. We snapshot that
mirror on a schedule (a Vercel cron hitting our own API route, writing to our own table) and
build hold periods from the snapshots ourselves. Resolution: ~15 minutes, which is ample
against a 72-hour target. Owner attribution works as long as `assignee_agent_id` is included.

### Shape 2 — they append one row per change, we do nothing

Append-only, one row per status change and per owner change: `ticket_id`, `event_ts` (UTC),
`from_status`, `to_status`, `from_status_type`, `to_status_type`, `actor_agent_id`,
`actor_type`, `source` (`IncomingResponse` marks a customer-driven reopen). Plus a 2–3 month
backfill from Zoho's ticket History endpoint, which returns exactly these fields — verified
against live tickets.

Better data: exact periods to the second, per-period owner, and reopen attribution for free.
More work for them than shape 1.

## What must not happen

**Do not overwrite the payload inside `support_dialogs`.** Today that payload documents the
ticket's state at the moment of a message, and metrics already computed on it (First Response
Time, Resolution Time, the sentiment dashboard) read it with that meaning. Turning it into
"latest known state" would silently change historical numbers. A separate ticket-level record
or event table keeps both intact.

Also not useful: Zoho's computed metrics (`firstResponseTime`, `resolutionTime`, per-status
times). They are business-hours based and exclude time spent Closed — on ticket
`550547000425594253` Zoho reports 117 hours where the calendar gap is 364. The spec requires
24/7 calendar time.

## Separate ask, different page

`First subscription date` reaches us on ~32% of requests. It drives the Tenure × Sentiment
heatmap on the **AI Sentiment** page (`/sentiment`). Unrelated to On Hold — file separately.
