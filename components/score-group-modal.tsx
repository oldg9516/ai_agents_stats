'use client'

/**
 * Score Group Modal Component
 *
 * Shows tickets filtered by score group (Critical, Needs Work, Good, Excluded)
 * for a specific category, version, and optionally date range
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { format } from 'date-fns'
import { IconExternalLink, IconLoader2 } from '@tabler/icons-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { useDashboardFilters } from '@/lib/store/hooks/use-dashboard-filters'
import { useScoreGroupTickets } from '@/lib/queries/score-group-queries'
import { getClassificationColor } from '@/constants/classification-types'
import { getCategoryLabel } from '@/constants/category-labels'
import type { ScoreGroup } from '@/constants/classification-types'

/**
 * Get display name for score group
 */
function getScoreGroupDisplay(
	scoreGroup: ScoreGroup,
	t: (key: string) => string
): { label: string; color: string } {
	const labels: Record<ScoreGroup, { label: string; color: string }> = {
		critical: {
			label: t('ticketsReview.scoreGroups.critical'),
			color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
		},
		needs_work: {
			label: t('ticketsReview.scoreGroups.needs_work'),
			color:
				'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
		},
		good: {
			label: t('ticketsReview.scoreGroups.good'),
			color:
				'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
		},
		excluded: {
			label: t('ticketsReview.scoreGroups.excluded'),
			color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
		},
	}
	return labels[scoreGroup]
}

export function ScoreGroupModal() {
	const t = useTranslations()
	const { scoreGroupModal, closeScoreGroupModal } = useDashboardFilters()
	const [currentPage, setCurrentPage] = useState(0)
	const pageSize = 20

	const { category, version, dates, scoreGroup, dateFilterMode } = scoreGroupModal

	// Fetch tickets
	const { data, isLoading, isFetching, error } = useScoreGroupTickets(
		category,
		version,
		dates,
		scoreGroup,
		dateFilterMode,
		currentPage,
		pageSize
	)

	// Handle close
	const handleClose = () => {
		setCurrentPage(0)
		closeScoreGroupModal()
	}

	// Get score group display info
	const scoreGroupInfo = scoreGroup
		? getScoreGroupDisplay(scoreGroup, t)
		: null

	return (
		<Dialog open={scoreGroupModal.isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-5xl h-[85vh] sm:h-[80vh] p-0 gap-0 flex flex-col overflow-hidden">
				<DialogHeader className="px-4 py-4 sm:px-6 sm:py-6 border-b shrink-0">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-3 flex-wrap">
								<DialogTitle className="text-lg sm:text-xl">
									{t('scoreGroupModal.title')}
								</DialogTitle>
								{scoreGroupInfo && (
									<Badge className={scoreGroupInfo.color}>
										{scoreGroupInfo.label}
									</Badge>
								)}
							</div>
							<DialogDescription className="text-sm mt-2 flex flex-wrap items-center gap-2">
								<span className="font-medium">
									{getCategoryLabel(category || '')}
								</span>
								<span className="text-muted-foreground">•</span>
								<span>{version}</span>
								{dates && (
									<>
										<span className="text-muted-foreground">•</span>
										<span>{dates}</span>
									</>
								)}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto overflow-x-hidden">
					<div className="p-4 sm:p-6">
						{/* Loading state */}
						{isLoading && (
							<div className="flex items-center justify-center py-12">
								<IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
								<span className="ml-3 text-muted-foreground">
									{t('scoreGroupModal.loading')}
								</span>
							</div>
						)}

						{/* Error state */}
						{error && (
							<div className="text-center py-12 text-destructive">
								<p>{error.message}</p>
							</div>
						)}

						{/* Empty state */}
						{!isLoading && !error && data.data.length === 0 && (
							<div className="text-center py-12 text-muted-foreground">
								<p>{t('scoreGroupModal.noTickets')}</p>
							</div>
						)}

						{/* Tickets table */}
						{!isLoading && !error && data.data.length > 0 && (
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[80px]">ID</TableHead>
											<TableHead>{t('table.ticketId')}</TableHead>
											<TableHead>
												{t('ticketsReview.table.classification')}
											</TableHead>
											<TableHead>{t('ticketsReview.table.agent')}</TableHead>
											<TableHead>
												{t('table.createdAt')}
											</TableHead>
											<TableHead className="w-[100px] text-right">
												{t('scoreGroupModal.actions')}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.data.map(ticket => (
											<TableRow key={ticket.id}>
												<TableCell className="font-mono text-sm">
													{ticket.id}
												</TableCell>
												<TableCell className="font-mono text-sm max-w-[150px] truncate">
													{ticket.ticket_id || '—'}
												</TableCell>
												<TableCell>
													{ticket.change_classification ? (
														<span
															className={`inline-block px-2 py-1 rounded text-xs ${getClassificationColor(
																ticket.change_classification
															)}`}
														>
															{t(
																`ticketsReview.classifications.${ticket.change_classification}` as never
															)}
														</span>
													) : (
														'—'
													)}
												</TableCell>
												<TableCell className="max-w-[150px] truncate">
													{ticket.email || '—'}
												</TableCell>
												<TableCell>
													{ticket.created_at
														? format(
																new Date(ticket.created_at),
																'MMM dd, yyyy HH:mm'
															)
														: '—'}
												</TableCell>
												<TableCell className="text-right">
													<Button variant="ghost" size="sm" asChild>
														<Link
															href={`/tickets-review/ticket/${ticket.id}`}
															target="_blank"
															rel="noopener noreferrer"
														>
															<IconExternalLink className="h-4 w-4" />
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}

						{/* Pagination */}
						{!isLoading && data.totalPages > 1 && (
							<div className="flex items-center justify-between mt-4 px-2">
								<div className="text-sm text-muted-foreground">
									{t('scoreGroupModal.pagination', {
										from: currentPage * pageSize + 1,
										to: Math.min(
											(currentPage + 1) * pageSize,
											data.total
										),
										total: data.total,
									})}
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(p => p - 1)}
										disabled={!data.hasPreviousPage || isFetching}
									>
										{t('scoreGroupModal.previous')}
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(p => p + 1)}
										disabled={!data.hasNextPage || isFetching}
									>
										{t('scoreGroupModal.next')}
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
