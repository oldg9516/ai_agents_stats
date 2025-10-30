'use client'

/**
 * InfoTooltip Component
 *
 * Displays an info icon (?) with a tooltip on hover
 * Used to provide contextual help for KPI cards, charts, etc.
 */

import { IconInfoCircle } from '@tabler/icons-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
	content: string
	className?: string
	iconClassName?: string
}

export function InfoTooltip({ content, className, iconClassName }: InfoTooltipProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type='button'
					className={cn(
						'inline-flex items-center justify-center rounded-full',
						'text-muted-foreground hover:text-foreground',
						'transition-colors',
						'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
						className
					)}
					aria-label='More information'
				>
					<IconInfoCircle
						className={cn('h-4 w-4', iconClassName)}
						aria-hidden='true'
					/>
				</button>
			</TooltipTrigger>
			<TooltipContent
				className='max-w-xs text-sm'
				side='top'
				sideOffset={5}
			>
				<p>{content}</p>
			</TooltipContent>
		</Tooltip>
	)
}
