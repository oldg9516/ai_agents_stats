import { IconAlertCircle } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface PageErrorStateProps {
	messageKey: string
	error: Error | null
	onRetry?: () => void
}

/**
 * Shared error state component for analytics pages.
 */
export function PageErrorState({ messageKey, error, onRetry }: PageErrorStateProps) {
	const t = useTranslations()

	return (
		<div className='flex flex-col items-center justify-center min-h-[400px] gap-4 px-4'>
			<IconAlertCircle className='h-12 w-12 text-destructive' />
			<div className='text-destructive text-lg font-semibold'>
				{t(messageKey as any)}
			</div>
			<div className='text-muted-foreground text-center max-w-md'>
				{error?.message}
			</div>
			{onRetry && (
				<Button onClick={onRetry} variant='outline'>
					{t('common.retry')}
				</Button>
			)}
		</div>
	)
}
