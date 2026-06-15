'use client'

/**
 * Retention Trace Modal
 *
 * Full transparency trace for one retention ticket: what the AI flow decided
 * at each step and the ground-truth outcome, plus a support-agent comment box.
 * Used by parallel routes to overlay without leaving the list.
 *
 * NOTE: ai_draft_reply is HTML produced by our own AI flow and stored in our
 * DB; it is shown only to authenticated @levhaolam.com staff. Rendered via
 * dangerouslySetInnerHTML to match the existing thread-detail-modal pattern.
 */

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
	IconExternalLink,
	IconMessages,
	IconAlertTriangle,
	IconRobot,
} from '@tabler/icons-react'
import { addRetentionCommentAction } from '@/lib/actions/retention-actions'
import { triggerRetentionRefresh } from '@/lib/hooks/use-paginated-retention'
import { cn } from '@/lib/utils'
import type {
	RetentionThreadTrace,
	RetentionTicketTrace,
	RetentionOutcome,
} from '@/lib/db/types'

interface RetentionTraceModalProps {
	trace: RetentionTicketTrace
}

const ZOHO_BASE = 'https://support.levhaolam.com/agent/levh/all/tickets/details'

function outcomeBadge(outcome: RetentionOutcome, t: (k: string) => string) {
	const map: Record<RetentionOutcome, string> = {
		auto_reply: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
		draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
		auto_close: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
		unknown: 'bg-muted text-muted-foreground',
	}
	return <Badge className={cn('text-xs', map[outcome])}>{t(`outcome.${outcome}`)}</Badge>
}

function Flag({ label, value }: { label: string; value: boolean | null }) {
	const tone =
		value === true
			? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
			: 'bg-muted text-muted-foreground'
	return (
		<Badge variant='outline' className={cn('text-[11px] font-normal', tone)}>
			{label}: {value === true ? '✓' : value === false ? '✗' : '—'}
		</Badge>
	)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className='space-y-1.5'>
			<h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
				{title}
			</h4>
			{children}
		</div>
	)
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
	if (value === null || value === undefined || value === '') return null
	return (
		<div className='flex gap-2 text-sm'>
			<span className='text-muted-foreground min-w-[140px]'>{label}</span>
			<span className='font-medium break-words'>{value}</span>
		</div>
	)
}

function ThreadTrace({
	thread,
	index,
	total,
	t,
}: {
	thread: RetentionThreadTrace
	index: number
	total: number
	t: (k: string) => string
}) {
	const sub = thread.subscription
	const aa = thread.actionAnalysis
	return (
		<div className='rounded-lg border p-4 space-y-4'>
			{total > 1 && (
				<div className='text-xs font-semibold text-muted-foreground'>
					{t('thread')} {index + 1}/{total} · {thread.threadId}
				</div>
			)}

			{thread.customerMessage && (
				<Section title={t('section.customerMessage')}>
					<div className='rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-auto'>
						{thread.customerMessage}
					</div>
				</Section>
			)}

			<Section title={t('section.classification')}>
				<div className='flex flex-wrap gap-1.5'>
					<Flag label={t('flag.requiresReply')} value={thread.requiresReply} />
					<Flag label={t('flag.requiresIdentification')} value={thread.requiresIdentification} />
					<Flag label={t('flag.requiresEditing')} value={thread.requiresEditing} />
					<Flag label={t('flag.requiresSubscriptionInfo')} value={thread.requiresSubscriptionInfo} />
					<Flag label={t('flag.requiresTrackingInfo')} value={thread.requiresTrackingInfo} />
					<Flag label={t('flag.requiresShopOrderInfo')} value={thread.requiresShopOrderInfo} />
				</div>
				<Field label={t('field.requestType')} value={thread.requestType} />
			</Section>

			<Section title={t('section.subcategory')}>
				<Field label={t('field.subtype')} value={thread.requestSubtype} />
				<Field label={t('field.subSubtype')} value={thread.requestSubSubtype} />
				{thread.subtypeOverride && (
					<Field label={t('field.subtypeOverride')} value={thread.subtypeOverrideReason ?? '✓'} />
				)}
			</Section>

			{sub && (
				<Section title={t('section.subscription')}>
					<Field
						label={t('field.status')}
						value={
							sub.currentStatus ? (
								<Badge
									className={cn(
										'text-xs',
										sub.currentStatus === 'Active'
											? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
											: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
									)}
								>
									{sub.currentStatus}
								</Badge>
							) : null
						}
					/>
					<Field label={t('field.orderToken')} value={sub.orderToken} />
					<Field label={t('field.customerNumber')} value={sub.customerNumber} />
					<Field label={t('field.frequency')} value={sub.frequency} />
					<Field
						label={t('field.price')}
						value={
							sub.regularBoxPrice
								? `${sub.regularBoxPrice} ${sub.priceCurrency ?? ''}`.trim()
								: null
						}
					/>
					<Field label={t('field.paymentMethod')} value={sub.paymentMethod} />
				</Section>
			)}

			{thread.isOutstanding && (
				<div className='rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3'>
					<div className='flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-sm'>
						<IconAlertTriangle className='h-4 w-4' />
						{t('section.outstanding')}
					</div>
					<div className='text-sm mt-1'>
						{t('outstandingReason')}:{' '}
						<span className='font-mono'>{thread.outstandingTrigger ?? '—'}</span>
					</div>
				</div>
			)}

			{aa && (
				<Section title={t('section.analysis')}>
					<Field
						label={t('field.requiresSystemAction')}
						value={
							aa.requiresSystemAction === null
								? '—'
								: aa.requiresSystemAction
									? t('yes')
									: t('no')
						}
					/>
					<Field label={t('field.actionType')} value={aa.actionType?.join(', ')} />
					<Field label={t('field.confidence')} value={aa.confidence} />
					{aa.actionDetails && (
						<div className='text-sm text-muted-foreground mt-1'>{aa.actionDetails}</div>
					)}
					{aa.reasoning && (
						<div className='text-sm italic text-muted-foreground mt-1'>{aa.reasoning}</div>
					)}
				</Section>
			)}

			<Section title={t('section.outcome')}>
				<div className='flex flex-wrap items-center gap-2'>
					{outcomeBadge(thread.outcome, t)}
					{thread.outcomeTag && (
						<Badge variant='outline' className='text-xs font-mono'>
							{thread.outcomeTag}
						</Badge>
					)}
					{thread.outcomeStatus && (
						<span className='text-xs text-muted-foreground'>
							{t('field.taskStatus')}: {thread.outcomeStatus}
						</span>
					)}
				</div>
				{thread.outcome === 'draft' && thread.reason && (
					<div className='mt-2 text-sm'>
						<span className='font-semibold'>{t('whyDraft')}:</span> {thread.reason}
						<div className='text-xs text-muted-foreground mt-0.5'>
							{t('reasonDisclaimer')}
						</div>
					</div>
				)}
			</Section>

			{thread.aiDraftReply && (
				<Section title={t('section.aiReply')}>
					<div className='flex items-center gap-1.5 text-xs text-muted-foreground mb-1'>
						<IconRobot className='h-3.5 w-3.5' /> Samantha
					</div>
					{/* Internal staff-only; HTML produced by our own AI flow. */}
					<div
						className='rounded-md border bg-background p-3 text-sm max-h-72 overflow-auto'
						dangerouslySetInnerHTML={{ __html: thread.aiDraftReply }}
					/>
				</Section>
			)}
		</div>
	)
}

export function RetentionTraceModal({ trace }: RetentionTraceModalProps) {
	const router = useRouter()
	const t = useTranslations('retention')
	const [comment, setComment] = useState('')
	const [saving, setSaving] = useState(false)
	const [comments, setComments] = useState(trace.comments)

	const handleClose = () => router.back()

	const handleSave = async () => {
		if (!comment.trim()) return
		setSaving(true)
		const res = await addRetentionCommentAction({
			ticketId: trace.ticketId,
			threadId: trace.threads[0]?.threadId ?? null,
			comment,
		})
		if (res.success) {
			toast.success(t('comment.saved'))
			setComments(prev => [
				{
					id: Date.now(),
					ticketId: trace.ticketId,
					threadId: trace.threads[0]?.threadId ?? null,
					author: t('comment.you'),
					comment: comment.trim(),
					createdAt: new Date().toISOString(),
				},
				...prev,
			])
			setComment('')
			triggerRetentionRefresh()
		} else {
			toast.error(res.error || t('comment.saveFailed'))
		}
		setSaving(false)
	}

	return (
		<Dialog open onOpenChange={handleClose}>
			<DialogContent className='w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<div className='flex flex-wrap items-start justify-between gap-3'>
						<div className='min-w-0'>
							<DialogTitle className='text-lg break-all'>
								{trace.subject || `${t('ticket')} ${trace.ticketId}`}
							</DialogTitle>
							<DialogDescription className='mt-1'>
								<span className='font-mono'>{trace.ticketId}</span>
								{trace.email && <> · {trace.email}</>}
							</DialogDescription>
						</div>
						<div className='flex gap-2 shrink-0'>
							<Button asChild size='sm' variant='outline'>
								<a href={`${ZOHO_BASE}/${trace.ticketId}`} target='_blank' rel='noreferrer'>
									<IconExternalLink className='h-4 w-4 mr-1' /> Zoho
								</a>
							</Button>
							<Button asChild size='sm' variant='outline'>
								<a
									href={`${ZOHO_BASE}/${trace.ticketId}/conversation`}
									target='_blank'
									rel='noreferrer'
								>
									<IconMessages className='h-4 w-4 mr-1' /> {t('conversation')}
								</a>
							</Button>
						</div>
					</div>
				</DialogHeader>

				<div className='space-y-4'>
					{trace.threads.map((thread, i) => (
						<ThreadTrace
							key={thread.threadId}
							thread={thread}
							index={i}
							total={trace.threads.length}
							t={t}
						/>
					))}

					<Separator />

					<div className='space-y-3'>
						<h4 className='text-sm font-semibold'>{t('comment.title')}</h4>
						<Textarea
							value={comment}
							onChange={e => setComment(e.target.value)}
							placeholder={t('comment.placeholder')}
							rows={3}
						/>
						<div className='flex justify-end'>
							<Button size='sm' onClick={handleSave} disabled={saving || !comment.trim()}>
								{saving ? t('comment.saving') : t('comment.save')}
							</Button>
						</div>

						{comments.length > 0 && (
							<div className='space-y-2'>
								{comments.map(c => (
									<div key={c.id} className='rounded-md border p-2.5 text-sm'>
										<div className='flex justify-between text-xs text-muted-foreground mb-0.5'>
											<span>{c.author}</span>
											<span>{new Date(c.createdAt).toLocaleString()}</span>
										</div>
										<div className='whitespace-pre-wrap'>{c.comment}</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
