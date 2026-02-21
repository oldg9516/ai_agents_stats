'use client'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'
import { useEffect } from 'react'

export default function AutomationOverviewError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error('Automation Overview error:', error)
	}, [error])

	return (
		<div className='flex min-h-screen items-center justify-center p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<div className='flex items-center gap-2'>
						<IconAlertTriangle className='h-5 w-5 text-red-600 dark:text-red-400' />
						<CardTitle>Something went wrong</CardTitle>
					</div>
					<CardDescription>
						An error occurred while loading automation overview
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='rounded-md bg-red-50 dark:bg-red-900/20 p-3'>
						<p className='text-sm text-red-800 dark:text-red-200 font-mono'>
							{error.message}
						</p>
					</div>

					<div className='flex gap-2'>
						<Button onClick={reset} className='flex-1'>
							<IconRefresh className='h-4 w-4 mr-2' />
							Try Again
						</Button>
						<Button
							variant='outline'
							onClick={() => (window.location.href = '/')}
							className='flex-1'
						>
							Go Home
						</Button>
					</div>

					{error.digest && (
						<p className='text-xs text-muted-foreground text-center'>
							Error ID: {error.digest}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
