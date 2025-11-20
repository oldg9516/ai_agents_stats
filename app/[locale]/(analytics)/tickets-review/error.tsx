'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import { useEffect } from 'react'

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error('Tickets Review Error:', error)
	}, [error])

	return (
		<div className='flex min-h-[400px] items-center justify-center p-4'>
			<Card className='max-w-md'>
				<CardHeader>
					<div className='flex items-center gap-2'>
						<IconAlertCircle className='h-5 w-5 text-destructive' />
						<CardTitle>Error Loading Tickets Review</CardTitle>
					</div>
					<CardDescription>
						Something went wrong while loading the tickets review page.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='rounded-lg bg-muted p-3'>
						<p className='text-sm text-muted-foreground'>
							{error.message || 'An unexpected error occurred'}
						</p>
						{error.digest && (
							<p className='mt-2 text-xs text-muted-foreground'>
								Error ID: {error.digest}
							</p>
						)}
					</div>
					<Button onClick={reset} className='w-full'>
						<IconRefresh className='mr-2 h-4 w-4' />
						Try Again
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
