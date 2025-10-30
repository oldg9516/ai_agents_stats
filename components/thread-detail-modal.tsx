'use client'

/**
 * Thread Detail Modal Component
 *
 * Shows thread details in a modal dialog
 * Used by Parallel Routes to display thread without leaving the list
 */

import { useRouter } from 'next/navigation'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IconCheck, IconX } from '@tabler/icons-react'
import { getStatusLabel } from '@/constants/support-statuses'
import { getRequestTypeLabel } from '@/constants/request-types'
import { REQUIREMENT_TYPES, getAllRequirementKeys } from '@/constants/requirement-types'
import { format } from 'date-fns'
import type { SupportThread } from '@/lib/supabase/types'

interface ThreadDetailModalProps {
	thread: SupportThread & {
		qualityPercentage: number | null
		changed: boolean | null
		email: string | null
	}
}

export function ThreadDetailModal({ thread }: ThreadDetailModalProps) {
	const router = useRouter()

	// Close modal by navigating back
	const handleClose = () => {
		router.back()
	}

	// Get active requirements
	const activeRequirements = getAllRequirementKeys().filter((key) => thread[key] === true)

	return (
		<Dialog open onOpenChange={handleClose}>
			<DialogContent className='max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-6xl max-h-[95vh] sm:max-h-[90vh] p-0 gap-0'>
				<DialogHeader className='px-4 py-4 sm:px-6 sm:py-6 border-b shrink-0'>
					<DialogTitle className='text-lg sm:text-xl'>Thread Details</DialogTitle>
					<DialogDescription className='font-mono text-xs sm:text-sm break-all'>
						{thread.thread_id}
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className='flex-1 h-full'>
					<div className='p-4 sm:p-6 space-y-4 sm:space-y-6'>
						<div className='grid gap-4 sm:gap-6 lg:grid-cols-2'>
							{/* Metadata Card */}
							<Card>
								<CardHeader>
									<CardTitle className='text-sm sm:text-base'>Thread Information</CardTitle>
									<CardDescription className='text-xs sm:text-sm'>
										Basic thread metadata
									</CardDescription>
								</CardHeader>
								<CardContent className='space-y-3 sm:space-y-4'>
									<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
										<div>
											<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
												Thread ID
											</p>
											<p className='text-xs sm:text-sm font-mono break-all'>
												{thread.thread_id}
											</p>
										</div>
										<div>
											<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
												Ticket ID
											</p>
											<p className='text-xs sm:text-sm font-mono break-all'>
												{thread.ticket_id}
											</p>
										</div>
									</div>

									<Separator />

									<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
										<div>
											<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
												Status
											</p>
											<p className='text-xs sm:text-sm'>{getStatusLabel(thread.status)}</p>
										</div>
										<div>
											<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
												Request Type
											</p>
											<p className='text-xs sm:text-sm'>
												{getRequestTypeLabel(thread.request_type)}
											</p>
										</div>
									</div>

									<Separator />

									<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
										<div>
											<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
												Prompt Version
											</p>
											<p className='text-xs sm:text-sm'>{thread.prompt_version || '—'}</p>
										</div>
										<div>
											<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
												Created At
											</p>
											<p className='text-xs sm:text-sm'>
												{thread.created_at
													? format(new Date(thread.created_at), 'MMM dd, yyyy HH:mm')
													: '—'}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Quality Metrics Card */}
							<Card>
								<CardHeader>
									<CardTitle className='text-sm sm:text-base'>Quality Metrics</CardTitle>
									<CardDescription className='text-xs sm:text-sm'>
										AI performance indicators
									</CardDescription>
								</CardHeader>
								<CardContent className='space-y-3 sm:space-y-4'>
									<div>
										<p className='text-xs sm:text-sm font-medium text-muted-foreground mb-2'>
											Has AI Draft
										</p>
										<div className='flex items-center gap-2'>
											{thread.ai_draft_reply ? (
												<>
													<IconCheck className='h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400' />
													<span className='text-xs sm:text-sm'>Yes</span>
												</>
											) : (
												<>
													<IconX className='h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400' />
													<span className='text-xs sm:text-sm'>No draft generated</span>
												</>
											)}
										</div>
									</div>

									<Separator />

									<div>
										<p className='text-xs sm:text-sm font-medium text-muted-foreground mb-2'>
											Quality Score
										</p>
										{thread.qualityPercentage !== null ? (
											<div className='flex flex-col sm:flex-row sm:items-center gap-2'>
												<div
													className={`px-2 sm:px-3 py-1 rounded font-medium text-xs sm:text-sm w-fit ${
														thread.qualityPercentage > 60
															? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
															: thread.qualityPercentage > 30
																? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
																: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
													}`}
												>
													{thread.qualityPercentage.toFixed(0)}%
												</div>
												<span className='text-xs text-muted-foreground'>
													{thread.changed ? 'Modified by agent' : 'Used without changes'}
												</span>
											</div>
										) : (
											<p className='text-xs sm:text-sm text-muted-foreground'>
												No quality data available
											</p>
										)}
									</div>

									<Separator />

									<div>
										<p className='text-xs sm:text-sm font-medium text-muted-foreground mb-2'>
											Reviewed By
										</p>
										<p className='text-xs sm:text-sm break-all'>
											{thread.email || 'Not reviewed'}
										</p>
									</div>
								</CardContent>
							</Card>

							{/* Requirements Card */}
							<Card className='lg:col-span-2'>
								<CardHeader>
									<CardTitle className='text-sm sm:text-base'>Requirements</CardTitle>
									<CardDescription className='text-xs sm:text-sm'>
										Thread processing requirements
									</CardDescription>
								</CardHeader>
								<CardContent>
									{activeRequirements.length > 0 ? (
										<div className='grid gap-3 sm:grid-cols-2'>
											{activeRequirements.map((key) => {
												const requirement = REQUIREMENT_TYPES[key]
												return (
													<div
														key={key}
														className='flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted'
													>
														<IconCheck className='h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
														<div>
															<p className='text-xs sm:text-sm font-medium'>
																{requirement.label}
															</p>
															<p className='text-xs text-muted-foreground'>
																{requirement.description}
															</p>
														</div>
													</div>
												)
											})}
										</div>
									) : (
										<div className='flex items-center justify-center h-24'>
											<p className='text-xs sm:text-sm text-muted-foreground'>
												No special requirements
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						{/* AI Draft Content */}
						<Card>
							<CardHeader>
								<CardTitle className='text-base sm:text-lg'>AI Draft Reply</CardTitle>
								<CardDescription className='text-xs sm:text-sm'>
									AI-generated response content
								</CardDescription>
							</CardHeader>
							<CardContent>
								{thread.ai_draft_reply ? (
									<div className='rounded-lg bg-muted p-3 sm:p-4 max-h-[50vh] overflow-y-auto'>
										<div
											className='prose prose-sm sm:prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed'
											dangerouslySetInnerHTML={{ __html: thread.ai_draft_reply }}
										/>
									</div>
								) : (
									<div className='flex items-center justify-center h-24'>
										<p className='text-xs sm:text-sm text-muted-foreground'>
											No AI draft generated for this thread
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}
