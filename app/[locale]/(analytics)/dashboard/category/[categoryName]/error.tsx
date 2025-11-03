'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	const t = useTranslations('common')

	useEffect(() => {
		console.error('Category detail error:', error)
	}, [error])

	return (
		<div className='container mx-auto p-6 flex items-center justify-center min-h-[60vh]'>
			<Card className='w-full max-w-lg'>
				<CardHeader>
					<div className='flex items-center gap-2'>
						<IconAlertTriangle className='h-5 w-5 text-destructive' />
						<CardTitle>{t('error')}</CardTitle>
					</div>
					<CardDescription>{t('errorDescription')}</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<p className='text-sm text-muted-foreground'>{error.message}</p>
					<Button onClick={() => reset()} className='w-full'>
						<IconRefresh className='h-4 w-4 mr-2' />
						{t('tryAgain')}
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
