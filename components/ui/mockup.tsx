import React from 'react'
import { cn } from '@/lib/utils'

interface MockupProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
}

const Mockup = React.forwardRef<HTMLDivElement, MockupProps>(
	({ className, children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				'relative rounded-xl border border-border bg-background',
				'shadow-2xl dark:shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]',
				'overflow-hidden',
				className
			)}
			{...props}
		>
			{/* Browser chrome mockup */}
			<div className='flex items-center gap-2 border-b border-border bg-muted px-4 py-3'>
				<div className='flex gap-1.5'>
					<div className='h-3 w-3 rounded-full bg-red-500' />
					<div className='h-3 w-3 rounded-full bg-yellow-500' />
					<div className='h-3 w-3 rounded-full bg-green-500' />
				</div>
				<div className='flex-1 rounded bg-background px-3 py-1 text-xs text-muted-foreground'>
					localhost:3000
				</div>
			</div>
			{/* Content */}
			<div className='relative bg-background'>{children}</div>
		</div>
	)
)
Mockup.displayName = 'Mockup'

export { Mockup }
