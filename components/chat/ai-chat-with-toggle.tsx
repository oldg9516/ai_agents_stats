'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AIChat } from './ai-chat'
import { DashChatLazy } from './dash-chat-dynamic'

type ChatMode = 'classic' | 'dash'

const STORAGE_KEY = 'ai-chat-mode'
const MODES: ChatMode[] = ['classic', 'dash']

interface AIChatWithToggleProps {
	webhookUrl: string
	className?: string
}

export function AIChatWithToggle({
	webhookUrl,
	className = '',
}: AIChatWithToggleProps) {
	const t = useTranslations('chat')
	const [mode, setMode] = useState<ChatMode>('classic')
	const [hydrated, setHydrated] = useState(false)

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY) as ChatMode | null
		if (saved && MODES.includes(saved)) {
			setMode(saved)
		}
		setHydrated(true)
	}, [])

	useEffect(() => {
		if (hydrated) {
			localStorage.setItem(STORAGE_KEY, mode)
		}
	}, [mode, hydrated])

	const handleModeChange = useCallback((newMode: ChatMode) => {
		setMode(newMode)
	}, [])

	const toggle = useMemo(() => (
		<div className='flex items-center gap-1 rounded-lg border p-0.5'>
			{MODES.map((m) => (
				<button
					key={m}
					onClick={() => handleModeChange(m)}
					className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
						mode === m
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:text-foreground'
					}`}
				>
					{t(`modeToggle.${m}`)}
				</button>
			))}
		</div>
	), [mode, handleModeChange, t])

	if (mode === 'dash') {
		return <DashChatLazy toggleSlot={toggle} className={className} />
	}

	return <AIChat webhookUrl={webhookUrl} toggleSlot={toggle} className={className} />
}
