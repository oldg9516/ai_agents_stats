'use client'

/**
 * Dash AI Chat — CopilotKit-powered self-learning SQL analytics chat.
 * Standalone version: no auth, no i18n, minimal dependencies.
 */

import { CopilotKit, useRenderToolCall } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
import '@copilotkit/react-ui/styles.css'
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
				stroke='var(--muted-foreground)'
				angle={-45}
				textAnchor='end'
				height={70}
				tick={{ fontSize: 11 }}
			/>
		)
		const commonYAxis = (
			<YAxis stroke='var(--muted-foreground)' tick={{ fontSize: 11 }} />
		)
		const commonGrid = <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
		const commonTooltip = (
			<Tooltip
				contentStyle={{
					backgroundColor: 'var(--popover)',
					border: '1px solid var(--border)',
					borderRadius: '8px',
					fontSize: 12,
				}}
				labelStyle={{ color: 'var(--popover-foreground)' }}
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
							<Line
								key={key}
								type='monotone'
								dataKey={key}
								stroke={COLORS[i % COLORS.length]}
								strokeWidth={2}
								dot={{ fill: COLORS[i % COLORS.length], r: 3 }}
								activeDot={{ r: 5 }}
							/>
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
							<Area
								key={key}
								type='monotone'
								dataKey={key}
								stroke={COLORS[i % COLORS.length]}
								fill={COLORS[i % COLORS.length]}
								fillOpacity={0.2}
								strokeWidth={2}
							/>
						))}
					</AreaChart>
				)
			case 'pie':
				return (
					<PieChart>
						<Pie
							data={data}
							cx='50%'
							cy='50%'
							outerRadius={120}
							dataKey={yKeys[0]}
							nameKey={xKey}
							label={({ name, percent }) =>
								percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : null
							}
							labelLine={true}
						>
							{data.map((_, i) => (
								<Cell key={i} fill={COLORS[i % COLORS.length]} />
							))}
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
		<div style={{ margin: '8px 0', width: '100%', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)' }}>
			{title && (
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', padding: '10px 16px' }}>
					<div style={{ height: '16px', width: '4px', borderRadius: '4px', background: 'var(--primary)' }} />
					<h3 style={{ fontSize: '14px', fontWeight: 600 }}>{title}</h3>
				</div>
			)}
			<div style={{ padding: '12px' }}>
				<ResponsiveContainer width='100%' height={height}>
					{chart}
				</ResponsiveContainer>
			</div>
		</div>
	)
}

function DashChatInner() {
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
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--muted-foreground)' }}>
						Generating chart...
					</div>
				)
			}

			if (!chartData || chartData.length === 0) {
				return <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--muted-foreground)' }}>No chart data available.</div>
			}

			return (
				<DashChart
					data={chartData}
					chartType={chartType}
					title={title}
					xKey={xKey}
					yKeys={yKeys}
				/>
			)
		},
	})

	return (
		<CopilotChat
			labels={{
				title: 'Dash AI',
				initial: 'Ask me anything about your database. I\'ll discover the schema and write SQL queries for you.',
				placeholder: 'Ask a question about your data...',
			}}
			className='h-full'
		/>
	)
}

export function DashChat() {
	const [threadId] = useState(() => crypto.randomUUID())

	return (
		<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<CopilotKit
				runtimeUrl='/api/copilot'
				agent='dash'
				threadId={threadId}
				showDevConsole={false}
			>
				<DashChatInner />
			</CopilotKit>
		</div>
	)
}
