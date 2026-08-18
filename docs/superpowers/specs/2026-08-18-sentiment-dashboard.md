# AI Sentiment Analytics dashboard

**Date**: 2026-08-18
**Source**: `IT_spec_sentiment_dashboard.docx` + `sentiment_dashboard.html` prototype (Irina)
**Page**: `/sentiment` — "AI Sentiment"

## The episode table already exists

The spec asks IT to build an episode (обращение) table with `episode_id`, `ticket_id`,
`sequence_number`, `episode_created_at`, `episode_sentiment`, `episode_subcategory`. That
table is `support_threads_data`: one row per customer request, already carrying the AI
sentiment and the AI subcategory.

| Spec field | Our column |
|---|---|
| `episode_id` | `thread_id` |
| `ticket_id` | `ticket_id` |
| `sequence_number` | `ROW_NUMBER()` over the ticket by `thread_date` |
| `episode_created_at` | `thread_date` (never null where sentiment is set) |
| `episode_sentiment` | `sentiment` — exactly the 5 spec categories |
| `episode_subcategory` | `request_subtype` |
| `episode_agent_id` | first outgoing message after the request, from `support_dialogs` |

So no new intake was needed for this dashboard, unlike the SLA metrics. Sentiment
classification starts 2026-06-16; 6930 classified requests exist, 4523 in the last 30 days
across 3992 tickets.

## What is missing

`first_subscription_date` for the tenure heatmap (spec §5) lives in the Zoho payload as
`customFields->'First subscription date'` and reaches only ~32% of requests (1441 of 4521
over 30 days). The heatmap ships with an explicit "no subscription date" bucket rather than
dropping those requests. Full tenure coverage is the one thing worth asking IT for.

## Implementation

- `SQL-RPC/get-sentiment-analytics.sql` — five functions: `get_sentiment_timeseries`,
  `get_sentiment_breakdown` (subcategory / tenure / weekday), `get_sentiment_trajectory`,
  `get_sentiment_patterns`, `get_sentiment_agent_quality`.
- Category ranks and weights are passed in as jsonb from
  `constants/sentiment-categories.ts`, so adding a category is a config edit with no SQL
  release (spec §12). A category with no weight still appears in the mix but is left out of
  the index — an unweighted category must be a deliberate choice, not a silent zero.
- Episode-level metrics filter on the request date; ticket-level metrics (resolution rate,
  worsened rate, patterns) assign a ticket to the bucket of its **first** request and read
  open/close across all of its requests, so a ticket straddling the window edge is not
  reported half-measured.
- Agent attribution credits each transition to the agent who answered the previous request,
  and the crediting reply must fall **between** the two customer messages — a reply sent
  after the customer had already written again is not what they reacted to.

## Performance notes

- `COALESCE(thread_date, created_at)` kept the planner off `idx_support_threads_thread_date`
  and cost ~8s per call. `thread_date` is never null where sentiment is set (6930/6930), so
  the COALESCE is gone and no new index was needed.
- Agent quality first ran 23–37s (a lateral reply lookup per request). Pairing consecutive
  requests first and bounding the reply lookup between them brought it to well under a
  second of query time.

## Deliberately not built

- **CSV/Excel export (spec §10).** It requires `customer_id`, and the spec itself asks for
  the export to be limited to Team Lead and above. The dashboard has no role model — every
  authenticated `@levhaolam.com` user sees everything — so shipping a PII export now would
  ignore the spec's own access requirement. Needs a decision before building.
- **Category-change annotation on charts (spec §12.2)**: no category has changed yet;
  worth adding when one does.
