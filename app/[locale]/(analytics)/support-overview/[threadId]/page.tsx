import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase/server'
import { fetchThreadDetail } from '@/lib/supabase/queries-support'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { IconArrowLeft, IconCheck, IconX } from '@tabler/icons-react'
import { getStatusLabel } from '@/constants/support-statuses'
import { getRequestTypeLabel } from '@/constants/request-types'
import { REQUIREMENT_TYPES, getAllRequirementKeys } from '@/constants/requirement-types'
import { format } from 'date-fns'

interface ThreadDetailPageProps {
	params: Promise<{
		threadId: string
	}>
}

export async function generateMetadata({
	params,
}: ThreadDetailPageProps): Promise<Metadata> {
	const { threadId } = await params
	return {
		title: `Thread ${threadId} | Support Overview`,
		description: `Details for support thread ${threadId}`,
	}
}

/**
 * Thread Detail Page
 *
 * Shows full details of a single support thread including:
 * - Metadata (IDs, dates, status, type)
 * - Requirements breakdown
 * - AI draft content
 * - Quality metrics from JOIN with ai_human_comparison
 */
export default async function ThreadDetailPage({ params }: ThreadDetailPageProps) {
	const { threadId } = await params

	// Fetch thread details
	let thread
	try {
		thread = await fetchThreadDetail(supabaseServer, threadId)
	} catch (error) {
		console.error('Error fetching thread:', error)
		notFound()
	}

	if (!thread) {
		notFound()
	}

	// Get active requirements
	const activeRequirements = getAllRequirementKeys().filter(
		(key) => thread[key] === true
	)

	return (
		<div className='min-h-screen p-4 sm:p-6 space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-4'>
					<Link href='/support-overview'>
						<Button variant='ghost' size='sm'>
							<IconArrowLeft className='h-4 w-4 mr-2' />
							Back to Overview
						</Button>
					</Link>
					<div>
						<h1 className='text-2xl font-bold'>Thread Details</h1>
						<p className='text-sm text-muted-foreground'>
							{thread.thread_id}
						</p>
					</div>
				</div>
			</div>

			<div className='grid gap-6 lg:grid-cols-2'>
				{/* Metadata Card */}
				<Card>
					<CardHeader>
						<CardTitle>Thread Information</CardTitle>
						<CardDescription>Basic thread metadata</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>Thread ID</p>
								<p className='text-sm font-mono'>{thread.thread_id}</p>
							</div>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>Ticket ID</p>
								<p className='text-sm font-mono'>{thread.ticket_id}</p>
							</div>
						</div>

						<Separator />

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>Status</p>
								<p className='text-sm'>{getStatusLabel(thread.status)}</p>
							</div>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>Request Type</p>
								<p className='text-sm'>{getRequestTypeLabel(thread.request_type)}</p>
							</div>
						</div>

						<Separator />

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>
									Prompt Version
								</p>
								<p className='text-sm'>{thread.prompt_version || '—'}</p>
							</div>
							<div>
								<p className='text-sm font-medium text-muted-foreground'>Created At</p>
								<p className='text-sm'>
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
						<CardTitle>Quality Metrics</CardTitle>
						<CardDescription>AI performance indicators</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div>
							<p className='text-sm font-medium text-muted-foreground mb-2'>
								Has AI Draft
							</p>
							<div className='flex items-center gap-2'>
								{thread.ai_draft_reply ? (
									<>
										<IconCheck className='h-5 w-5 text-green-600 dark:text-green-400' />
										<span className='text-sm'>Yes</span>
									</>
								) : (
									<>
										<IconX className='h-5 w-5 text-red-600 dark:text-red-400' />
										<span className='text-sm'>No draft generated</span>
									</>
								)}
							</div>
						</div>

						<Separator />

						<div>
							<p className='text-sm font-medium text-muted-foreground mb-2'>
								Quality Score
							</p>
							{thread.qualityPercentage !== null ? (
								<div className='flex items-center gap-2'>
									<div
										className={`px-3 py-1 rounded font-medium ${
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
										{thread.changed
											? 'Modified by agent'
											: 'Used without changes'}
									</span>
								</div>
							) : (
								<p className='text-sm text-muted-foreground'>
									No quality data available
								</p>
							)}
						</div>

						<Separator />

						<div>
							<p className='text-sm font-medium text-muted-foreground mb-2'>
								Reviewed By
							</p>
							<p className='text-sm'>{thread.email || 'Not reviewed'}</p>
						</div>
					</CardContent>
				</Card>

				{/* Requirements Card */}
				<Card>
					<CardHeader>
						<CardTitle>Requirements</CardTitle>
						<CardDescription>Thread processing requirements</CardDescription>
					</CardHeader>
					<CardContent>
						{activeRequirements.length > 0 ? (
							<div className='space-y-3'>
								{activeRequirements.map((key) => {
									const requirement = REQUIREMENT_TYPES[key]
									return (
										<div
											key={key}
											className='flex items-start gap-3 p-3 rounded-lg bg-muted'
										>
											<IconCheck className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5' />
											<div>
												<p className='text-sm font-medium'>
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
								<p className='text-sm text-muted-foreground'>
									No special requirements
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* AI Draft Content */}
				<Card className='lg:col-span-2'>
					<CardHeader>
						<CardTitle>AI Draft Reply</CardTitle>
						<CardDescription>AI-generated response content</CardDescription>
					</CardHeader>
					<CardContent>
						{thread.ai_draft_reply ? (
							<div className='rounded-lg bg-muted p-4 max-h-96 overflow-y-auto'>
								<pre className='text-sm whitespace-pre-wrap font-sans'>
									{thread.ai_draft_reply}
								</pre>
							</div>
						) : (
							<div className='flex items-center justify-center h-24'>
								<p className='text-sm text-muted-foreground'>
									No AI draft generated for this thread
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
