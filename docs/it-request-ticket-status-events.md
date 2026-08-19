# IT request — On Hold measurement

**Status**: draft for Irina to file
**Date**: 2026-08-19 (revised)
**Unlocks**: On Hold Duration, exact Reopen Rate attribution
(`TZ_SLA_Metrics_IT.pdf` §4, §5) on the **Agent SLA stats** page (`/agents-stats`)

Two options are described. **Option A is the ask** — it adds fields to the payload we
already receive and needs no new table, no webhook and no change to the n8n flow.
Option B is only needed if the business requires per-hold-period attribution.

## Why the data we already receive is not enough

n8n stores a Zoho ticket snapshot on every message (`support_dialogs.data->payload`), and
the snapshot does carry `status`, `statusType` and `onholdTime`. The blockers are:

1. **`onholdTime` is cleared on exit.** Measured over 90 days: all 150 tickets currently in
   an On Hold status carry it, and zero of the 22 591 tickets sitting in Open or Closed do.
   The payload records "is on hold now", never "was on hold".
2. **We only observe a ticket when a message arrives.** Over 90 days a snapshot caught a
   ticket mid-hold on 506 of 22 741 tickets (2.2%). Tickets average 1.99 snapshots, 44% have
   exactly one, and the median gap between snapshots is 5.7h with a p90 of 81h — a hold
   usually starts and ends between two messages.

## What works in our favour

The stored payload is refreshed *after* the last message on **94.6%** of closed tickets
(6863 of 7256 over 60 days) and 91.7% of open ones. So any value Zoho **persists on the
ticket** will be picked up by the delivery we already have, with no new pipeline.

## Option A (the ask) — persist a few fields and send them in the existing payload

| Field | Meaning |
|---|---|
| `onHoldTotalMinutes` | Cumulative time the ticket spent in `statusType = On Hold`, calendar 24/7, not business hours |
| `onHoldPeriodsCount` | How many separate hold periods the ticket had |
| `lastOnHoldStart` / `lastOnHoldEnd` | Timestamps of the most recent hold period, UTC ISO 8601 |
| `lastOnHoldOwnerAgentId` | Agent who owned the ticket during that last hold period |
| `lastClosedByAgentId` | Agent who set the last `Closed` — makes Reopen Rate attribution exact |
| `reopenCount` | Number of `Closed → Open` cycles (Zoho already computes this internally) |

The fields must **persist** after the ticket leaves hold — that is the whole point, and it is
what `onholdTime` fails to do.

Precedent for feasibility: Zoho already runs the custom function `Save prev status//ES`,
which writes the previous status into a field on status change. This is an extension of that
pattern rather than a new integration.

### What Option A cannot give

The spec (§4) asks for every hold period separately, credited to its owner at the time. With
cumulative fields we get the total per ticket plus the last period exactly; the breakdown for
tickets held more than once is lost. Tickets *currently* on hold may also be undercounted
until the next message, since only 37.5% of on-hold snapshots are refreshed after the last
message — harmless for a KPI computed over finished periods.

## Option B (fallback) — status event stream

Only if per-period attribution is mandatory: one appended row per status change and per owner
change (`ticket_id`, `event_ts` UTC, `from_status`/`to_status`,
`from_status_type`/`to_status_type`, owner transition, `actor_agent_id`, `actor_type`,
`source`), plus a 2–3 month backfill from Zoho's ticket History endpoint, which returns
exactly these fields — verified against live tickets. This needs a new table and a delivery
path, which is the expensive part.

## Do not send Zoho's computed metrics

`firstResponseTime`, `resolutionTime` and the per-status times from Zoho's metrics endpoint
are measured in business hours and exclude time spent Closed: on ticket
`550547000425594253` Zoho reports 117 hours where the calendar gap is 364. The spec requires
24/7 calendar time, so those fields would contradict it.

## Separate ask, different page

`First subscription date` reaches us on ~32% of requests (1441 of 4521 over 30 days). It
drives the Tenure × Sentiment heatmap on the **AI Sentiment** page (`/sentiment`), where "no
subscription date" is currently the largest bucket. Unrelated to On Hold — can be filed
separately.
