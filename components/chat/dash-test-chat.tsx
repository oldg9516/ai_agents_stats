'use client'

/**
 * Dash Test Chat — connects to dash-test agent (external DB).
 * Reuses the same DashChatActions from dash-chat.tsx but points to /api/copilot-test.
 */

import { CopilotKit, useRenderToolCall } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
import '@copilotkit/react-ui/styles.css'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
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
						{commonGrid}{commonXAxis}{commonYAxis}{commonTooltip}
						{yKeys.length > 1 && <Legend />}
						{yKeys.map((key, i) => (
							<Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
						))}
					</BarChart>
				)
			case 'line':
				return (
					<LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
						{commonGrid}{commonXAxis}{commonYAxis}{commonTooltip}
						{yKeys.length > 1 && <Legend />}
						{yKeys.map((key, i) => (
							<Line key={key} type='monotone' dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ fill: COLORS[i % COLORS.length], r: 3 }} activeDot={{ r: 5 }} />
						))}
					</LineChart>
				)
			case 'area':
				return (
					<AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
						{commonGrid}{commonXAxis}{commonYAxis}{commonTooltip}
						{yKeys.length > 1 && <Legend />}
						{yKeys.map((key, i) => (
							<Area key={key} type='monotone' dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} strokeWidth={2} />
						))}
					</AreaChart>
				)
			case 'pie':
				return (
					<PieChart>
						<Pie data={data} cx='50%' cy='50%' outerRadius={120} dataKey={yKeys[0]} nameKey={xKey}
							label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : null} labelLine={true}>
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

function DashTestChatActions({ labels }: { labels: { title: string; initial: string; placeholder: string } }) {
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

	return <CopilotChat labels={labels} className='h-full' />
}

interface DashTestChatProps {
	toggleSlot?: React.ReactNode
	className?: string
}

export function DashTestChat({ toggleSlot, className = '' }: DashTestChatProps) {
	const t = useTranslations('chat.dashTest')
	const [threadId] = useState(() => crypto.randomUUID())

	const labels = useMemo(() => ({
		title: t('title'),
		initial: t('initial'),
		placeholder: t('placeholder'),
	}), [t])

	return (
		<div className={cn('flex h-full flex-col', className)}>
			{toggleSlot && (
				<div className='flex items-center justify-between border-b px-4 py-2'>
					<div className='flex items-center gap-2'>
						<h2 className='text-sm font-semibold'>{t('title')}</h2>
						<span className='text-muted-foreground text-xs'>{t('subtitle')}</span>
					</div>
					{toggleSlot}
				</div>
			)}
			<div className='dash-chat-wrapper flex-1 overflow-hidden'>
				<CopilotKit
					runtimeUrl='/api/copilot-test'
					agent='dash-test'
					threadId={threadId}
					showDevConsole={false}
				>
					<DashTestChatActions labels={labels} />
				</CopilotKit>
			</div>
		</div>
	)
}
