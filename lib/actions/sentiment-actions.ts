'use server'

/**
 * AI Sentiment Analytics Server Actions
 *
 * Every metric is computed by the get_sentiment_* RPC functions
 * (SQL-RPC/get-sentiment-analytics.sql) — the client only renders what comes back,
 * as the spec requires (§8.4).
 *
 * Category ranks and weights travel with each call from constants/sentiment-categories.ts,
 * so a new category needs no SQL change (§12).
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { REQUEST_TIMEOUT } from '@/lib/queries/query-config'
import {
	SENTIMENT_RANKS,
	SENTIMENT_WEIGHTS,
	type SentimentGranularity,
} from '@/constants/sentiment-categories'
import type {
	SentimentAgentQualityRow,
	SentimentBreakdownRow,
	SentimentDistribution,
	SentimentPatternRow,
	SentimentTimeseriesBucket,
	SentimentTrajectoryPoint,
} from '@/lib/db/types'

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string }

export type SentimentBreakdownDimension = 'subcategory' | 'tenure' | 'weekday'

function createTimeoutPromise(ms: number, operationName: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(() => reject(new Error(`${operationName} timed out after ${ms}ms`)), ms)
	)
}

async function requireAuth(): Promise<void> {
	const session = await auth()
	if (!session?.user?.email) {
		throw new Error('Unauthorized')
	}
}

const ranksJson = JSON.stringify(SENTIMENT_RANKS)
const weightsJson = JSON.stringify(SENTIMENT_WEIGHTS)

/** The RPC returns jsonb; counts arrive as numbers or numeric strings depending on driver */
function toDistribution(raw: unknown): SentimentDistribution {
	if (!raw || typeof raw !== 'object') {
		return {}
	}
	return Object.fromEntries(
		Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
			key,
			Number(value) || 0,
		])
	)
}

async function runQuery<T>(
	operationName: string,
	query: Promise<{ rows: unknown[] }>,
	map: (rows: Record<string, unknown>[]) => T
): Promise<ActionResult<T>> {
	try {
		await requireAuth()
		const startTime = Date.now()

		const result = await Promise.race([
			query,
			createTimeoutPromise(REQUEST_TIMEOUT, operationName),
		])

		const data = map(result.rows as Record<string, unknown>[])
		console.log(`[Sentiment] ${operationName} in ${Date.now() - startTime}ms`)

		return { success: true, data }
	} catch (error) {
		console.error(`❌ [Sentiment] ${operationName} failed:`, error)
		return {
			success: false,
			error: error instanceof Error ? error.message : `${operationName} failed`,
		}
	}
}

/** Time series of episode and ticket metrics (spec §3.1–3.4, §8.1) */
export async function fetchSentimentTimeseries(
	from: Date,
	to: Date,
	granularity: SentimentGranularity
): Promise<ActionResult<SentimentTimeseriesBucket[]>> {
	return runQuery(
		'timeseries',
		db.execute(sql`SELECT * FROM get_sentiment_timeseries(
			${from.toISOString()}::timestamptz,
			${to.toISOString()}::timestamptz,
			${granularity}::text,
			${ranksJson}::jsonb,
			${weightsJson}::jsonb
		)`),
		rows =>
			rows.map(row => ({
				periodStart: String(row.period_start),
				episodeCount: Number(row.episode_count),
				ticketCount: Number(row.ticket_count),
				sentimentIndex: Number(row.sentiment_index),
				distribution: toDistribution(row.distribution),
				improvedCount: Number(row.improved_count),
				worsenedCount: Number(row.worsened_count),
				resolutionRate: Number(row.resolution_rate),
				worsenedRate: Number(row.worsened_rate),
			}))
	)
}

/** Subcategory, tenure or weekday breakdown (spec §4, §5, §7) */
export async function fetchSentimentBreakdown(
	from: Date,
	to: Date,
	dimension: SentimentBreakdownDimension
): Promise<ActionResult<SentimentBreakdownRow[]>> {
	return runQuery(
		`breakdown:${dimension}`,
		db.execute(sql`SELECT * FROM get_sentiment_breakdown(
			${from.toISOString()}::timestamptz,
			${to.toISOString()}::timestamptz,
			${dimension}::text,
			${ranksJson}::jsonb
		)`),
		rows =>
			rows.map(row => ({
				bucketKey: String(row.bucket_key),
				bucketOrder: Number(row.bucket_order),
				episodeCount: Number(row.episode_count),
				distribution: toDistribution(row.distribution),
				severityCount: Number(row.severity_count),
				severityShare: Number(row.severity_share),
			}))
	)
}

/** Average index by request position inside a ticket (spec §6.1) */
export async function fetchSentimentTrajectory(
	from: Date,
	to: Date
): Promise<ActionResult<SentimentTrajectoryPoint[]>> {
	return runQuery(
		'trajectory',
		db.execute(sql`SELECT * FROM get_sentiment_trajectory(
			${from.toISOString()}::timestamptz,
			${to.toISOString()}::timestamptz,
			${weightsJson}::jsonb
		)`),
		rows =>
			rows.map(row => ({
				positionBucket: Number(row.position_bucket),
				episodeCount: Number(row.episode_count),
				sentimentIndex: Number(row.sentiment_index),
			}))
	)
}

/** Shape of the sentiment path per ticket (spec §6.2) */
export async function fetchSentimentPatterns(
	from: Date,
	to: Date
): Promise<ActionResult<SentimentPatternRow[]>> {
	return runQuery(
		'patterns',
		db.execute(sql`SELECT * FROM get_sentiment_patterns(
			${from.toISOString()}::timestamptz,
			${to.toISOString()}::timestamptz,
			${ranksJson}::jsonb
		)`),
		rows =>
			rows.map(row => ({
				pattern: String(row.pattern),
				ticketCount: Number(row.ticket_count),
				share: Number(row.share),
			}))
	)
}

/** Episode-delta attribution per agent (spec §3.5) */
export async function fetchSentimentAgentQuality(
	from: Date,
	to: Date
): Promise<ActionResult<SentimentAgentQualityRow[]>> {
	return runQuery(
		'agentQuality',
		db.execute(sql`SELECT * FROM get_sentiment_agent_quality(
			${from.toISOString()}::timestamptz,
			${to.toISOString()}::timestamptz,
			${ranksJson}::jsonb,
			${'api@levhaolam.com'}::text
		)`),
		rows =>
			rows.map(row => ({
				email: String(row.email),
				transitions: Number(row.transitions),
				improved: Number(row.improved),
				worsened: Number(row.worsened),
				unchanged: Number(row.unchanged),
				improvedShare: Number(row.improved_share),
			}))
	)
}
