'use client'

/**
 * ChartCard with Tooltip Component
 *
 * Wrapper for chart cards that adds an info tooltip to the header
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { ReactNode } from 'react'

interface ChartCardWithTooltipProps {
	title: string
	description?: string
	tooltipContent?: string
	children: ReactNode
	className?: string
}

export function ChartCardWithTooltip({
	title,
	description,
	tooltipContent,
	children,
	className,
}: ChartCardWithTooltipProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-1.5 flex-1'>
						<CardTitle className='text-base sm:text-lg'>{title}</CardTitle>
						{tooltipContent && <InfoTooltip content={tooltipContent} />}
					</div>
				</div>
				{description && (
					<CardDescription className='text-xs sm:text-sm'>{description}</CardDescription>
				)}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	)
}
