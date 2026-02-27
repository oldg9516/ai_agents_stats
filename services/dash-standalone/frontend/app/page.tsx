'use client'

import { DashChat } from '@/components/chat'

export default function Home() {
	return (
		<main className='flex h-screen flex-col'>
			<header className='flex items-center gap-3 border-b px-6 py-3'>
				<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white'>
					D
				</div>
				<div>
					<h1 className='text-sm font-semibold'>Dash AI</h1>
					<p className='text-xs' style={{ color: 'var(--muted-foreground)' }}>
						Self-learning analytics agent
					</p>
				</div>
			</header>
			<div className='flex-1 overflow-hidden'>
				<DashChat />
			</div>
		</main>
	)
}
