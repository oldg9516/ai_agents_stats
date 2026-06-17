'use client'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { IconMessageCircle } from '@tabler/icons-react'
import type { RetentionListItem, RetentionOutcome } from '@/lib/db/types'

interface RetentionTableProps {
	data: RetentionListItem[]
	hasMore: boolean
	isFetchingMore: boolean
	onLoadMore: () => void
	/** Route base for the detail modal link (default '/retention'). */
	basePath?: string
}

function outcomeClass(outcome: RetentionOutcome): string {
	switch (outcome) {
		case 'auto_reply':
			return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
		case 'draft':
			return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
		case 'auto_close':
			return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
		default:
			return 'bg-muted text-muted-foreground'
	}
}

export function RetentionTable({
	data,
	hasMore,
	isFetchingMore,
	onLoadMore,
	basePath = '/retention',
}: RetentionTableProps) {
	const t = useTranslations('retention')

	return (
		<div className='space-y-3'>
			<div className='rounded-md border overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className='w-[150px]'>{t('table.date')}</TableHead>
							<TableHead>{t('table.subject')}</TableHead>
							<TableHead className='w-[180px]'>{t('table.subtype')}</TableHead>
							<TableHead className='w-[110px]'>{t('table.status')}</TableHead>
							<TableHead className='w-[120px]'>{t('table.outstanding')}</TableHead>
							<TableHead className='w-[120px]'>{t('table.outcome')}</TableHead>
							<TableHead className='w-[60px] text-center'>
								<IconMessageCircle className='h-4 w-4 inline' />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className='text-center text-muted-foreground py-8'>
									{t('table.noResults')}
								</TableCell>
							</TableRow>
						) : (
							data.map(item => (
								<TableRow key={item.threadId} className='hover:bg-muted/40'>
									<TableCell className='text-xs text-muted-foreground'>
										{new Date(item.createdAt).toLocaleString()}
									</TableCell>
									<TableCell>
										<Link
											href={`${basePath}/ticket/${item.ticketId}`}
											className='font-medium hover:underline line-clamp-1'
										>
											{item.subject || item.ticketId}
										</Link>
										<div className='text-xs text-muted-foreground'>
											{item.email}
										</div>
									</TableCell>
									<TableCell className='text-xs'>
										<div>{item.requestSubtype}</div>
										{item.requestSubSubtype && (
											<div className='text-muted-foreground'>{item.requestSubSubtype}</div>
										)}
									</TableCell>
									<TableCell>
										{item.subscriptionStatus ? (
											<Badge
												variant='outline'
												className={cn(
													'text-xs',
													item.subscriptionStatus === 'Active'
														? 'text-green-600 dark:text-green-400'
														: 'text-amber-600 dark:text-amber-400',
												)}
											>
												{item.subscriptionStatus}
											</Badge>
										) : (
											<span className='text-muted-foreground text-xs'>—</span>
										)}
									</TableCell>
									<TableCell>
										{item.isOutstanding ? (
											<Badge className='bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[11px]'>
												{item.outstandingTrigger || t('yes')}
											</Badge>
										) : (
											<span className='text-muted-foreground text-xs'>—</span>
										)}
									</TableCell>
									<TableCell>
										<Badge className={cn('text-xs', outcomeClass(item.outcome))}>
											{t(`outcome.${item.outcome}`)}
										</Badge>
									</TableCell>
									<TableCell className='text-center text-xs text-muted-foreground'>
										{item.commentCount > 0 ? item.commentCount : ''}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{hasMore && (
				<div className='flex justify-center'>
					<Button variant='outline' size='sm' onClick={onLoadMore} disabled={isFetchingMore}>
						{isFetchingMore ? t('table.loading') : t('table.loadMore')}
					</Button>
				</div>
			)}
		</div>
	)
}
