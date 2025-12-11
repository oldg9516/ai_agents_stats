'use client'

import type { SpecificIssue } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { IconAlertTriangle } from '@tabler/icons-react'

interface SpecificIssuesProps {
	issues: SpecificIssue[]
}

/**
 * Specific Issues - Displays identified issues from the backlog
 */
export function SpecificIssues({ issues }: SpecificIssuesProps) {
	const t = useTranslations()

	// Handle case where issues is not an array (e.g., from JSON parsing)
	const issuesArray = Array.isArray(issues) ? issues : []

	if (issuesArray.length === 0) {
		return (
			<div className='flex items-center justify-center min-h-[200px] text-muted-foreground'>
				{t('backlogReports.detail.noIssues')}
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			{issuesArray.map((issue, index) => (
				<Card key={index}>
					<CardHeader className='pb-2'>
						<div className='space-y-2'>
							<div className='flex items-start gap-2'>
								<IconAlertTriangle className='h-5 w-5 text-yellow-500 mt-0.5 shrink-0' />
								<CardTitle className='text-base'>{issue.issue}</CardTitle>
							</div>
							{issue.affected_period && (
								<p className='ml-7 text-xs text-muted-foreground italic'>
									{issue.affected_period}
								</p>
							)}
						</div>
					</CardHeader>
					<CardContent>
						<CardDescription className='text-sm whitespace-pre-wrap'>
							{issue.details}
						</CardDescription>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
