'use client'

import { Button } from '@/components/ui/button'
import { IconCopy } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

interface CodeDisplayProps {
	code: string
	language?: string
}

export function CodeDisplay({ code, language = 'sql' }: CodeDisplayProps) {
	const t = useTranslations('chat.message')

	return (
		<div className='w-full bg-card rounded-lg my-2 overflow-hidden border'>
			<div className='flex items-center justify-between px-4 py-2 bg-muted border-b border-border'>
				<span className='text-xs text-muted-foreground uppercase'>
					{language}
				</span>
				<Button
					variant='ghost'
					size='sm'
					onClick={() => navigator.clipboard.writeText(code)}
					className='h-7 text-xs'
				>
					<IconCopy className='w-3 h-3 mr-1' />
					{t('copy')}
				</Button>
			</div>
			<pre className='p-4 overflow-x-auto text-sm'>
				<code className='text-green-500 dark:text-green-400'>{code}</code>
			</pre>
		</div>
	)
}
