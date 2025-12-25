'use client'

/**
 * Agent Changes Modal Component
 *
 * Shows tickets changed by a specific agent with tabs for:
 * - All Changes
 * - Critical (real AI errors)
 * - Unnecessary (AI was correct)
 */

import { useState, useEffect } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { useAgentsStatsFilters } from '@/lib/store/hooks/use-agents-stats-filters'
import { useAgentChangeTickets } from '@/lib/queries/agents-stats-queries'
import { getClassificationColor } from '@/constants/classification-types'
import type { AgentChangeType } from '@/lib/supabase/types'

/**
 * Get tab color styling
 */
function getTabColor(type: AgentChangeType): string {
	switch (type) {
		case 'critical':
			return 'data-[state=active]:bg-red-100 data-[state=active]:text-red-800 dark:data-[state=active]:bg-red-900/50 dark:data-[state=active]:text-red-300'
		case 'unnecessary':
			return 'data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800 dark:data-[state=active]:bg-yellow-900/50 dark:data-[state=active]:text-yellow-300'
		default:
			return ''
	}
}

export function AgentChangesModal() {
	const t = useTranslations('agentsStats')
	const tCommon = useTranslations()
	const {
		agentChangesModal,
		closeAgentChangesModal,
		setAgentChangesType,
		filters,
	} = useAgentsStatsFilters()
	const [currentPage, setCurrentPage] = useState(0)
	const pageSize = 20

	const { isOpen, agentEmail, changeType } = agentChangesModal

	// Reset page when modal opens or changeType changes
	useEffect(() => {
		setCurrentPage(0)
	}, [agentEmail, changeType])

	// Fetch tickets
	const { data, total, totalPages, isLoading, isFetching, error } =
		useAgentChangeTickets(
			agentEmail,
			filters,
			changeType,
			currentPage,
			pageSize
		)

	// Handle close
	const handleClose = () => {
		setCurrentPage(0)
		closeAgentChangesModal()
	}

	// Handle tab change
	const handleTabChange = (value: string) => {
		setAgentChangesType(value as AgentChangeType)
		setCurrentPage(0)
	}

	const hasNextPage = currentPage < totalPages - 1
	const hasPreviousPage = currentPage > 0

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-5xl h-[85vh] sm:h-[80vh] p-0 gap-0 flex flex-col overflow-hidden">
				<DialogHeader className="px-4 py-4 sm:px-6 sm:py-6 border-b shrink-0">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-3 flex-wrap">
								<DialogTitle className="text-lg sm:text-xl">
									{t('modal.title')}
								</DialogTitle>
							</div>
							<DialogDescription className="text-sm mt-2 flex flex-wrap items-center gap-2">
								<span className="font-medium font-mono">{agentEmail}</span>
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto overflow-x-hidden">
					<div className="p-4 sm:p-6">
						{/* Tabs */}
						<Tabs value={changeType} onValueChange={handleTabChange}>
							<TabsList className="mb-4">
								<TabsTrigger value="all" className={getTabColor('all')}>
									{t('modal.tabs.all')}
								</TabsTrigger>
								<TabsTrigger
									value="critical"
									className={getTabColor('critical')}
								>
									{t('modal.tabs.critical')}
								</TabsTrigger>
								<TabsTrigger
									value="unnecessary"
									className={getTabColor('unnecessary')}
								>
									{t('modal.tabs.unnecessary')}
								</TabsTrigger>
							</TabsList>

							<TabsContent value={changeType} className="mt-0">
								{/* Loading state */}
								{isLoading && (
									<div className="flex items-center justify-center py-12">
										<IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
										<span className="ml-3 text-muted-foreground">
											{t('modal.loading')}
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
								{!isLoading && !error && data.length === 0 && (
									<div className="text-center py-12 text-muted-foreground">
										<p>{t('modal.noTickets')}</p>
									</div>
								)}

								{/* Tickets table */}
								{!isLoading && !error && data.length > 0 && (
									<div className="rounded-md border">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-[80px]">ID</TableHead>
													<TableHead>{t('modal.ticketId')}</TableHead>
													<TableHead>{t('modal.classification')}</TableHead>
													<TableHead>{t('modal.category')}</TableHead>
													<TableHead>{t('modal.version')}</TableHead>
													<TableHead>{t('modal.date')}</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{data.map(ticket => (
													<TableRow key={ticket.id}>
														<TableCell className="font-mono text-sm">
															{ticket.id}
														</TableCell>
														<TableCell className="font-mono text-sm max-w-[150px] truncate">
															{ticket.ticket_id ? (
																<Link
																	href={`https://desk.zoho.com/agent/levhaolam/tickets/details/${ticket.ticket_id}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-blue-600 hover:underline flex items-center gap-1"
																>
																	{ticket.ticket_id}
																	<IconExternalLink className="h-3 w-3" />
																</Link>
															) : (
																'—'
															)}
														</TableCell>
														<TableCell>
															{ticket.change_classification ? (
																<span
																	className={`inline-block px-2 py-1 rounded text-xs ${getClassificationColor(
																		ticket.change_classification
																	)}`}
																>
																	{tCommon(
																		`ticketsReview.classifications.${ticket.change_classification}` as never
																	)}
																</span>
															) : (
																'—'
															)}
														</TableCell>
														<TableCell className="max-w-[150px] truncate">
															{ticket.request_subtype || '—'}
														</TableCell>
														<TableCell>{ticket.prompt_version || '—'}</TableCell>
														<TableCell>
															{ticket.created_at
																? format(
																		new Date(ticket.created_at),
																		'MMM dd, yyyy HH:mm'
																	)
																: '—'}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}

								{/* Pagination */}
								{!isLoading && totalPages > 1 && (
									<div className="flex items-center justify-between mt-4 px-2">
										<div className="text-sm text-muted-foreground">
											{t('modal.pagination', {
												from: currentPage * pageSize + 1,
												to: Math.min((currentPage + 1) * pageSize, total),
												total: total,
											})}
										</div>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCurrentPage(p => p - 1)}
												disabled={!hasPreviousPage || isFetching}
											>
												{t('modal.previous')}
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCurrentPage(p => p + 1)}
												disabled={!hasNextPage || isFetching}
											>
												{t('modal.next')}
											</Button>
										</div>
									</div>
								)}
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
