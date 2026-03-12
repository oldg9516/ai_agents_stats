'use client'

/**
 * Eval Intent Diagnostics — Modal and Full-page views
 *
 * Shows diagnostic distributions: failure origin, error shape,
 * fixability, confidence, and override details
 */

import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from '@/i18n/routing'
import { useEvalFilters } from '@/lib/store/hooks/use-eval-filters'
import { useEvalIntentDiagnostics } from '@/lib/queries/eval-queries'
import type { DistributionEntry } from '@/lib/supabase/queries-eval'

// ============================================================================
// Shared diagnostic content
// ============================================================================

function DiagnosticBlock({
	title,
	entries,
}: {
	title: string
	entries: DistributionEntry[]
}) {
	if (entries.length === 0) return null

	return (
		<Card>
			<CardHeader className='pb-3'>
				<CardTitle className='text-sm font-medium'>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Value</TableHead>
							<TableHead className='text-right'>Count</TableHead>
							<TableHead className='text-right'>%</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{entries.map(entry => (
							<TableRow key={entry.value}>
								<TableCell className='font-medium'>{entry.value}</TableCell>
								<TableCell className='text-right'>{entry.count}</TableCell>
								<TableCell className='text-right'>{entry.percent}%</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}

function OverrideBlock({
	title,
	details,
}: {
	title: string
	details: {
		total: number
		signalCount: number
		followedCount: number
		overriddenCount: number
	}
}) {
	const t = useTranslations('evalDashboard.diagnostics')

	if (details.total === 0) return null

	const rows = [
		{ label: t('signal'), count: details.signalCount },
		{ label: t('followed'), count: details.followedCount },
		{ label: t('overridden'), count: details.overriddenCount },
	]

	return (
		<Card>
			<CardHeader className='pb-3'>
				<CardTitle className='text-sm font-medium'>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Type</TableHead>
							<TableHead className='text-right'>Count</TableHead>
							<TableHead className='text-right'>%</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map(row => (
							<TableRow key={row.label}>
								<TableCell className='font-medium'>{row.label}</TableCell>
								<TableCell className='text-right'>{row.count}</TableCell>
								<TableCell className='text-right'>
									{details.total > 0
										? Math.round((row.count / details.total) * 1000) / 10
										: 0}%
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}

function DiagnosticsContent({ intentId }: { intentId: string }) {
	const t = useTranslations('evalDashboard.diagnostics')
	const tCommon = useTranslations('common')
	const { filters } = useEvalFilters()
	const { data, isLoading, error } = useEvalIntentDiagnostics(filters, intentId)

	if (isLoading) {
		return (
			<div className='space-y-4'>
				{[1, 2, 3, 4, 5].map(i => (
					<Skeleton key={i} className='h-32 w-full' />
				))}
			</div>
		)
	}

	if (error) {
		return (
			<div className='py-8 text-center text-muted-foreground'>
				{tCommon('error.fetchFailed')}
			</div>
		)
	}

	if (!data) {
		return (
			<div className='py-8 text-center text-muted-foreground'>
				{tCommon('noData')}
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			<div className='text-sm text-muted-foreground'>
				{t('totalRecords')}: {data.totalRecords}
			</div>
			<DiagnosticBlock title={t('failureOrigin')} entries={data.failureOrigin} />
			<DiagnosticBlock title={t('errorShape')} entries={data.errorShape} />
			<DiagnosticBlock title={t('fixability')} entries={data.fixability} />
			<DiagnosticBlock title={t('confidence')} entries={data.confidence} />
			<OverrideBlock title={t('overrideDetails')} details={data.overrideDetails} />
		</div>
	)
}

// ============================================================================
// Modal view (intercepted route)
// ============================================================================

export function EvalIntentDiagnosticsModal({ intentId }: { intentId: string }) {
	const router = useRouter()
	const t = useTranslations('evalDashboard')

	const handleClose = () => {
		router.back()
	}

	const parts = intentId.split('::')
	const subtitle = parts[1] ? `${parts[0]} / ${parts[1]}` : parts[0]

	return (
		<Dialog open onOpenChange={handleClose}>
			<DialogContent className='max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-4xl h-[95vh] sm:h-[90vh] p-0 gap-0 flex flex-col overflow-hidden'>
				<DialogHeader className='p-4 sm:p-6 pb-0'>
					<DialogTitle>{t('diagnostics.title')}</DialogTitle>
					<DialogDescription>{subtitle}</DialogDescription>
				</DialogHeader>
				<div className='flex-1 overflow-y-auto p-4 sm:p-6'>
					<DiagnosticsContent intentId={intentId} />
				</div>
			</DialogContent>
		</Dialog>
	)
}

// ============================================================================
// Full-page view (direct URL access)
// ============================================================================

export function EvalIntentDiagnosticsFullPage({ intentId }: { intentId: string }) {
	const t = useTranslations('evalDashboard')

	const parts = intentId.split('::')
	const subtitle = parts[1] ? `${parts[0]} / ${parts[1]}` : parts[0]

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			<div className='flex items-center gap-4'>
				<Button variant='ghost' size='icon' asChild>
					<Link href='/eval-dashboard'>
						<IconArrowLeft className='size-4' />
					</Link>
				</Button>
				<div>
					<h1 className='text-lg font-semibold'>{t('diagnostics.title')}</h1>
					<p className='text-sm text-muted-foreground'>{subtitle}</p>
				</div>
			</div>
			<DiagnosticsContent intentId={intentId} />
		</div>
	)
}
