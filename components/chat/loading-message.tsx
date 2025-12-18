'use client'

import { useTranslations } from 'next-intl'

export function LoadingMessage() {
	const t = useTranslations('chat.message')

	return (
		<div className='flex justify-start mb-4'>
			<div className='bg-muted rounded-2xl rounded-bl-md px-4 py-3'>
				<div className='flex items-center space-x-2'>
					<div className='flex space-x-1'>
						<div
							className='w-2 h-2 bg-orange-500 rounded-full animate-bounce'
							style={{ animationDelay: '0ms' }}
						/>
						<div
							className='w-2 h-2 bg-orange-500 rounded-full animate-bounce'
							style={{ animationDelay: '150ms' }}
						/>
						<div
							className='w-2 h-2 bg-orange-500 rounded-full animate-bounce'
							style={{ animationDelay: '300ms' }}
						/>
					</div>
					<span className='text-sm text-muted-foreground'>
						{t('analyzing')}
					</span>
				</div>
			</div>
		</div>
	)
}
