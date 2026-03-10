'use client'

/**
 * Dash AI Chat — CopilotKit-powered self-learning SQL analytics chat.
 * With session sidebar (reuses AIChat pattern) and threadId persistence.
 */

import { CopilotKit, useRenderToolCall } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
import '@copilotkit/react-ui/styles.css'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	IconCheck,
	IconMessage,
	IconMessages,
	IconPencil,
	IconPlus,
	IconSparkles,
	IconTrash,
	IconX,
} from '@tabler/icons-react'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'

const COLORS = [
	'#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
	'#22c55e', '#f97316', '#ef4444', '#06b6d4',
]

// --- Session types ---

interface DashSession {
	id: string
	visitor_id: string
	title: string | null
	created_at: string
	updated_at: string
	metadata: Record<string, unknown>
	is_archived: boolean
}

// --- Session API helpers ---

async function fetchSessions(): Promise<DashSession[]> {
	const resp = await fetch('/api/dash-sessions')
	if (!resp.ok) return []
	return resp.json()
}

async function createSessionApi(title?: string): Promise<DashSession | null> {
	const resp = await fetch('/api/dash-sessions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title }),
	})
	if (!resp.ok) return null
	return resp.json()
}

async function renameSessionApi(id: string, title: string): Promise<boolean> {
	const resp = await fetch(`/api/dash-sessions/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title }),
	})
	return resp.ok
}

async function deleteSessionApi(id: string): Promise<boolean> {
	const resp = await fetch(`/api/dash-sessions/${id}`, { method: 'DELETE' })
	return resp.ok
}

// --- localStorage helpers ---

const STORAGE_KEY = 'dash-current-session'

function getSavedSession(): string | null {
	if (typeof window === 'undefined') return null
	return localStorage.getItem(STORAGE_KEY)
}

function setSavedSession(id: string) {
	if (typeof window === 'undefined') return
	localStorage.setItem(STORAGE_KEY, id)
}

// --- Chart component (unchanged) ---

function DashChart({
	data,
	chartType,
	title,
	xKey,
	yKeys,
}: {
	data: Record<string, unknown>[]
	chartType: string
	title: string
	xKey: string
	yKeys: string[]
}) {
	const chart = useMemo(() => {
		const commonXAxis = (
			<XAxis
				dataKey={xKey}
				stroke='hsl(var(--muted-foreground))'
				angle={-45}
				textAnchor='end'
				height={70}
				tick={{ fontSize: 11 }}
			/>
		)
		const commonYAxis = (
			<YAxis stroke='hsl(var(--muted-foreground))' tick={{ fontSize: 11 }} />
		)
		const commonGrid = <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' />
		const commonTooltip = (
			<Tooltip
				contentStyle={{
					backgroundColor: 'hsl(var(--popover))',
					border: '1px solid hsl(var(--border))',
					borderRadius: '8px',
					fontSize: 12,
				}}
				labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
			/>
		)

		switch (chartType) {
			case 'bar':
				return (
					<BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
						{commonGrid}
						{commonXAxis}
						{commonYAxis}
						{commonTooltip}
						{yKeys.length > 1 && <Legend />}
						{yKeys.map((key, i) => (
							<Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
						))}
					</BarChart>
				)
			case 'line':
				return (
					<LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
						{commonGrid}
						{commonXAxis}
						{commonYAxis}
						{commonTooltip}
						{yKeys.length > 1 && <Legend />}
						{yKeys.map((key, i) => (
							<Line key={key} type='monotone' dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ fill: COLORS[i % COLORS.length], r: 3 }} activeDot={{ r: 5 }} />
						))}
					</LineChart>
				)
			case 'area':
				return (
					<AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
						{commonGrid}
						{commonXAxis}
						{commonYAxis}
						{commonTooltip}
						{yKeys.length > 1 && <Legend />}
						{yKeys.map((key, i) => (
							<Area key={key} type='monotone' dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} strokeWidth={2} />
						))}
					</AreaChart>
				)
			case 'pie':
				return (
					<PieChart>
						<Pie data={data} cx='50%' cy='50%' outerRadius={120} dataKey={yKeys[0]} nameKey={xKey} label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : null} labelLine={true}>
							{data.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
						</Pie>
						{commonTooltip}
						<Legend layout='horizontal' verticalAlign='bottom' />
					</PieChart>
				)
			default:
				return null
		}
	}, [data, chartType, xKey, yKeys])

	if (!chart) return null
	const height = chartType === 'pie' ? 380 : 320

	return (
		<div className='my-2 w-full rounded-lg border bg-background'>
			{title && (
				<div className='flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5'>
					<div className='h-4 w-1 rounded-full bg-primary' />
					<h3 className='text-sm font-semibold'>{title}</h3>
				</div>
			)}
			<div className='p-3'>
				<ResponsiveContainer width='100%' height={height}>
					{chart}
				</ResponsiveContainer>
			</div>
		</div>
	)
}

// --- CopilotKit inner component with generative UI ---

function DashChatActions({ labels, onFirstMessage }: { labels: { title: string; initial: string; placeholder: string }; onFirstMessage?: (text: string) => void }) {
	const titleUpdatedRef = useRef(false)

	const handleSubmitMessage = useCallback((message: string) => {
		if (!titleUpdatedRef.current && onFirstMessage && message.trim()) {
			titleUpdatedRef.current = true
			onFirstMessage(message.trim())
		}
	}, [onFirstMessage])

	useRenderToolCall({
		name: 'render_chart',
		description: 'Display an interactive chart in the chat',
		parameters: [
			{ name: 'chart_type', type: 'string', description: 'Chart type: line, bar, area, pie' },
			{ name: 'title', type: 'string', description: 'Chart title' },
			{ name: 'data', type: 'string', description: 'JSON array of data points' },
			{ name: 'x_key', type: 'string', description: 'X axis key' },
			{ name: 'y_keys', type: 'string', description: 'Comma-separated Y axis keys' },
		],
		render: ({ status, args }) => {
			let chartData: Record<string, unknown>[] | null = null
			let chartType = 'bar'
			let title = ''
			let xKey = ''
			let yKeys: string[] = []

			try {
				if (args?.data) {
					const rawData = args.data as string
					chartData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData as unknown as Record<string, unknown>[]
					chartType = String(args.chart_type || 'bar')
					title = String(args.title || '')
					xKey = String(args.x_key || '')
					yKeys = args.y_keys ? String(args.y_keys).split(',').map((k: string) => k.trim()) : []
				}
			} catch {
				// ignore parse errors
			}

			if (status === 'inProgress' && !chartData) {
				return (
					<div className='flex items-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground'>
						<div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
						Generating chart...
					</div>
				)
			}

			if (!chartData || chartData.length === 0) {
				return <div className='rounded-lg border p-4 text-sm text-muted-foreground'>No chart data available.</div>
			}

			return <DashChart data={chartData} chartType={chartType} title={title} xKey={xKey} yKeys={yKeys} />
		},
	})

	return <CopilotChat labels={labels} className='h-full' onSubmitMessage={handleSubmitMessage} />
}

// --- Main DashChat component with sidebar ---

interface DashChatProps {
	toggleSlot?: React.ReactNode
	className?: string
}

export function DashChat({ toggleSlot, className = '' }: DashChatProps) {
	const t = useTranslations('chat')
	const tDash = useTranslations('chat.dash')

	const [sessions, setSessions] = useState<DashSession[]>([])
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
	const [showHistory, setShowHistory] = useState(false)
	const [isInitializing, setIsInitializing] = useState(true)

	// Edit session title state
	const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
	const [editingTitle, setEditingTitle] = useState('')
	const editInputRef = useRef<HTMLInputElement>(null)

	// Delete confirmation dialog
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string | null } | null>(null)

	const labels = useMemo(() => ({
		title: tDash('title'),
		initial: tDash('initial'),
		placeholder: tDash('placeholder'),
	}), [tDash])

	// Initialize: load sessions and restore last session
	useEffect(() => {
		const init = async () => {
			try {
				const dbSessions = await fetchSessions()
				setSessions(dbSessions)

				const savedId = getSavedSession()
				if (savedId && dbSessions.some(s => s.id === savedId)) {
					setCurrentSessionId(savedId)
				}
			} finally {
				setIsInitializing(false)
			}
		}
		init()
	}, [])

	// Create new session
	const handleNewChat = useCallback(async () => {
		const session = await createSessionApi()
		if (session) {
			setSessions(prev => [session, ...prev])
			setCurrentSessionId(session.id)
			setSavedSession(session.id)
		}
		setShowHistory(false)
	}, [])

	// Switch session
	const handleSelectSession = useCallback((sessionId: string) => {
		setCurrentSessionId(sessionId)
		setSavedSession(sessionId)
		setShowHistory(false)
	}, [])

	// Rename session
	const handleStartEdit = (sessionId: string, currentTitle: string | null) => {
		setEditingSessionId(sessionId)
		setEditingTitle(currentTitle || '')
		setTimeout(() => editInputRef.current?.focus(), 0)
	}

	const handleSaveEdit = async () => {
		if (editingSessionId && editingTitle.trim()) {
			const success = await renameSessionApi(editingSessionId, editingTitle.trim())
			if (success) {
				setSessions(prev => prev.map(s => s.id === editingSessionId ? { ...s, title: editingTitle.trim() } : s))
			}
		}
		setEditingSessionId(null)
		setEditingTitle('')
	}

	const handleCancelEdit = () => {
		setEditingSessionId(null)
		setEditingTitle('')
	}

	// Delete session
	const handleDeleteClick = (sessionId: string, title: string | null) => {
		setSessionToDelete({ id: sessionId, title })
		setDeleteDialogOpen(true)
	}

	const handleConfirmDelete = async () => {
		if (sessionToDelete) {
			const success = await deleteSessionApi(sessionToDelete.id)
			if (success) {
				setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id))
				if (currentSessionId === sessionToDelete.id) {
					setCurrentSessionId(null)
					setSavedSession('')
				}
			}
		}
		setDeleteDialogOpen(false)
		setSessionToDelete(null)
	}

	const handleCancelDelete = () => {
		setDeleteDialogOpen(false)
		setSessionToDelete(null)
	}

	if (isInitializing) {
		return (
			<div className='flex justify-center items-center w-full h-full'>
				<Spinner className='size-8 text-orange-500' />
			</div>
		)
	}

	return (
		<div className={cn('flex h-full', className)}>
			{/* History Sidebar */}
			<div
				className={`bg-card border-r flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
					showHistory ? 'w-72' : 'w-0 border-r-0'
				}`}
			>
				<div className='w-72 flex flex-col h-full'>
					<div className='flex items-center justify-between px-6 py-4 border-b'>
						<h3 className='text-lg font-semibold'>{t('history')}</h3>
						<Button variant='ghost' size='icon' onClick={() => setShowHistory(false)} className='h-8 w-8'>
							<IconX className='w-4 h-4' />
						</Button>
					</div>

					<div className='p-3'>
						<Button onClick={handleNewChat} className='w-full' size='sm'>
							<IconPlus className='w-4 h-4 mr-2' />
							{t('newChat')}
						</Button>
					</div>

					<div className='flex-1 overflow-y-auto px-2 pb-4'>
						{sessions.length === 0 ? (
							<p className='text-sm text-muted-foreground text-center py-4'>{t('emptyTitle')}</p>
						) : (
							sessions.map(session => (
								<div
									key={session.id}
									className={`group flex items-center mb-1 rounded-md ${
										currentSessionId === session.id ? 'bg-secondary' : 'hover:bg-accent'
									}`}
								>
									{editingSessionId === session.id ? (
										<div className='flex items-center w-full px-2 py-1.5 gap-1'>
											<input
												ref={editInputRef}
												type='text'
												value={editingTitle}
												onChange={e => setEditingTitle(e.target.value)}
												onKeyDown={e => {
													if (e.key === 'Enter') handleSaveEdit()
													if (e.key === 'Escape') handleCancelEdit()
												}}
												className='flex-1 text-sm bg-background border rounded px-2 py-1 min-w-0'
											/>
											<Button variant='ghost' size='icon' className='h-7 w-7 shrink-0' onClick={handleSaveEdit}>
												<IconCheck className='w-4 h-4' />
											</Button>
											<Button variant='ghost' size='icon' className='h-7 w-7 shrink-0' onClick={handleCancelEdit}>
												<IconX className='w-4 h-4' />
											</Button>
										</div>
									) : (
										<>
											<Button
												variant='ghost'
												onClick={() => handleSelectSession(session.id)}
												className='flex-1 justify-start h-auto py-2 px-2 min-w-0'
											>
												<IconMessage className='w-4 h-4 mr-2 shrink-0' />
												<span className='truncate text-sm text-left'>
													{session.title || t('newChat')}
												</span>
											</Button>
											<div className='flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-1'>
												<Button
													variant='ghost'
													size='icon'
													className='h-7 w-7'
													onClick={e => { e.stopPropagation(); handleStartEdit(session.id, session.title) }}
													title={t('rename')}
												>
													<IconPencil className='w-3.5 h-3.5' />
												</Button>
												<Button
													variant='ghost'
													size='icon'
													className='h-7 w-7 text-destructive hover:text-destructive'
													onClick={e => { e.stopPropagation(); handleDeleteClick(session.id, session.title) }}
													title={t('delete')}
												>
													<IconTrash className='w-3.5 h-3.5' />
												</Button>
											</div>
										</>
									)}
								</div>
							))
						)}
					</div>
				</div>
			</div>

			{/* Main Chat Area */}
			<div className='flex-1 flex flex-col min-w-0'>
				{/* Header */}
				<div className='flex items-center justify-between px-6 py-4 border-b'>
					<div className='flex items-center space-x-3'>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => setShowHistory(!showHistory)}
							className='h-9 w-9'
							title={t('history')}
						>
							<IconMessages className='w-6 h-6' />
						</Button>
						<div className='p-2 bg-indigo-500 rounded-lg'>
							<IconSparkles className='w-5 h-5 text-white' />
						</div>
						<div>
							<h2 className='text-lg font-semibold'>{tDash('title')}</h2>
							<p className='text-xs text-muted-foreground'>{tDash('subtitle')}</p>
						</div>
					</div>
					<div className='flex items-center gap-3'>
						{toggleSlot}
						<Button variant='ghost' size='sm' onClick={handleNewChat} className='flex items-center space-x-2'>
							<IconPlus className='w-4 h-4' />
							<span>{t('newChat')}</span>
						</Button>
					</div>
				</div>

				{/* CopilotKit Chat */}
				<div className='dash-chat-wrapper flex-1 overflow-hidden'>
					{currentSessionId ? (
						<CopilotKit
							key={currentSessionId}
							runtimeUrl='/api/copilot'
							agent='dash'
							threadId={currentSessionId}
							showDevConsole={false}
						>
							<DashChatActions
								labels={labels}
								onFirstMessage={(text) => {
									const title = text.slice(0, 50) + (text.length > 50 ? '...' : '')
									renameSessionApi(currentSessionId, title)
									setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title } : s))
								}}
							/>
						</CopilotKit>
					) : (
						<div className='flex flex-col items-center justify-center h-full text-center px-6'>
							<div className='p-4 bg-indigo-100 dark:bg-indigo-950 rounded-full mb-4'>
								<IconSparkles className='w-8 h-8 text-indigo-600 dark:text-indigo-400' />
							</div>
							<h3 className='text-xl font-semibold mb-2'>{tDash('title')}</h3>
							<p className='text-muted-foreground mb-6 max-w-md'>{tDash('initial')}</p>
							<Button onClick={handleNewChat} size='lg'>
								<IconPlus className='w-5 h-5 mr-2' />
								{t('newChat')}
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className='sm:max-w-[400px]' showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>{t('deleteDialog.title')}</DialogTitle>
						<DialogDescription>
							{t('deleteDialog.description', { title: sessionToDelete?.title || t('newChat') })}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className='gap-3'>
						<Button variant='outline' onClick={handleCancelDelete}>{t('deleteDialog.cancel')}</Button>
						<Button variant='destructive' onClick={handleConfirmDelete}>{t('deleteDialog.confirm')}</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
