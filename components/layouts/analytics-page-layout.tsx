import type { ReactNode } from 'react'

interface AnalyticsPageLayoutProps {
	filterSheet: ReactNode
	dateRange: ReactNode
	children: ReactNode
}

/**
 * Shared layout for all analytics content pages.
 * Provides consistent spacing, filter+date positioning, and responsive behavior.
 */
export function AnalyticsPageLayout({ filterSheet, dateRange, children }: AnalyticsPageLayoutProps) {
	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
				<div className='lg:order-1'>{filterSheet}</div>
				<div className='lg:order-2 lg:flex-1'>{dateRange}</div>
			</div>
			{children}
		</div>
	)
}
