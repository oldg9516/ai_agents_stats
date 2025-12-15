'use client'

/**
 * AI Chat System - Message Components
 */

import React, { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'
import { ChatMessage, CHART_COLORS, formatNumber, formatDateTime } from '@/types/chat'
import { IconCopy, IconRefresh, IconPencil, IconCheck, IconX, IconDownload, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { ReportCard } from './report-card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations, useLocale } from 'next-intl'

// Constants
const MAX_MESSAGE_LENGTH = 300 // Characters before truncating

// === Chart Display Component ===

// Format field names: snake_case/camelCase → readable text
function formatFieldName(name: string): string {
	return name
		.replace(/_/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/\b\w/g, c => c.toUpperCase())
}

interface ChartDisplayProps {
	data: Record<string, unknown>[]
	chartType: string
	config?: {
		xKey?: string
		yKey?: string | string[]
		title?: string
	}
}

export function ChartDisplay({ data, chartType, config }: ChartDisplayProps) {
	const t = useTranslations('chat.chart')
	const [showDataSource, setShowDataSource] = useState(false)
	const xKey = config?.xKey || Object.keys(data[0] || {})[0] || 'name'
	const yKey = config?.yKey || Object.keys(data[0] || {})[1] || 'value'
	const yKeys = Array.isArray(yKey) ? yKey : [yKey]

	// Custom tooltip formatter
	const tooltipFormatter = (value: number, name: string) => {
		return [formatNumber(value), formatFieldName(name)]
	}

	// Download CSV function
	const downloadCSV = () => {
		if (!data || data.length === 0) return

		const headers = Object.keys(data[0])
		const csvContent = [
			headers.join(','),
			...data.map(row =>
				headers.map(h => {
					const val = row[h]
					// Escape quotes and wrap in quotes if contains comma
					const strVal = String(val ?? '')
					if (strVal.includes(',') || strVal.includes('"')) {
						return `"${strVal.replace(/"/g, '""')}"`
					}
					return strVal
				}).join(',')
			)
		].join('\n')

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `data_${new Date().toISOString().split('T')[0]}.csv`
		link.click()
		URL.revokeObjectURL(link.href)
	}

	const chartContent = useMemo(() => {
		switch (chartType) {
			case 'bar_chart':
				return (
					<BarChart
						data={data}
						margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
					>
						<CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' />
						<XAxis
							dataKey={xKey}
							stroke='hsl(var(--muted-foreground))'
							angle={-45}
							textAnchor='end'
							height={80}
							tick={{ fontSize: 12 }}
						/>
						<YAxis
							stroke='hsl(var(--muted-foreground))'
							tick={{ fontSize: 12 }}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: 'hsl(var(--popover))',
								border: '1px solid hsl(var(--border))',
								borderRadius: '8px',
							}}
							labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
							formatter={tooltipFormatter}
						/>
						{yKeys.length > 1 && <Legend formatter={formatFieldName} />}
						{yKeys.map((key, index) => (
							<Bar
								key={key}
								dataKey={key}
								name={formatFieldName(key)}
								fill={CHART_COLORS[index % CHART_COLORS.length]}
								radius={[4, 4, 0, 0]}
							/>
						))}
					</BarChart>
				)

			case 'line_chart':
				return (
					<LineChart
						data={data}
						margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
					>
						<CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' />
						<XAxis
							dataKey={xKey}
							stroke='hsl(var(--muted-foreground))'
							angle={-45}
							textAnchor='end'
							height={80}
							tick={{ fontSize: 12 }}
						/>
						<YAxis
							stroke='hsl(var(--muted-foreground))'
							tick={{ fontSize: 12 }}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: 'hsl(var(--popover))',
								border: '1px solid hsl(var(--border))',
								borderRadius: '8px',
							}}
							labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
							formatter={tooltipFormatter}
						/>
						{yKeys.length > 1 && <Legend formatter={formatFieldName} />}
						{yKeys.map((key, index) => (
							<Line
								key={key}
								type='monotone'
								dataKey={key}
								name={formatFieldName(key)}
								stroke={CHART_COLORS[index % CHART_COLORS.length]}
								strokeWidth={2}
								dot={{
									fill: CHART_COLORS[index % CHART_COLORS.length],
									strokeWidth: 2,
								}}
								activeDot={{ r: 6 }}
							/>
						))}
					</LineChart>
				)

			case 'pie_chart':
				return (
					<PieChart>
						<Pie
							data={data}
							cx='50%'
							cy='50%'
							labelLine={true}
							label={({ name, percent }) => {
								// Only show label if segment is large enough (> 5%)
								if (percent < 0.05) return null
								return `${name}: ${(percent * 100).toFixed(1)}%`
							}}
							outerRadius={140}
							fill='#8884d8'
							dataKey={yKeys[0]}
							nameKey={xKey}
						>
							{data.map((_, index) => (
								<Cell
									key={`cell-${index}`}
									fill={CHART_COLORS[index % CHART_COLORS.length]}
								/>
							))}
						</Pie>
						<Tooltip
							contentStyle={{
								backgroundColor: 'hsl(var(--popover))',
								border: '1px solid hsl(var(--border))',
								borderRadius: '8px',
							}}
							formatter={tooltipFormatter}
						/>
						<Legend
							layout='horizontal'
							verticalAlign='bottom'
							align='center'
							wrapperStyle={{ paddingTop: 20 }}
						/>
					</PieChart>
				)

			default:
				return null
		}
	}, [data, chartType, xKey, yKeys, tooltipFormatter])

	// Dynamic height based on chart type and data size
	const getChartHeight = () => {
		if (chartType === 'pie_chart') {
			// More height for pie charts with many segments + legend
			const legendRows = Math.ceil(data.length / 3) // ~3 items per row in legend
			return 400 + legendRows * 25
		}
		return 350
	}

	return (
		<div className='w-full rounded-lg my-2'>
			{/* Chart with title bar */}
			<div className='border rounded-lg overflow-hidden'>
				{/* Title bar */}
				{config?.title && (
					<div className='flex items-center gap-2 px-4 py-3 border-b bg-muted/30'>
						<div className='w-1 h-5 bg-primary rounded-full' />
						<h3 className='text-base font-semibold text-foreground'>
							{config.title}
						</h3>
					</div>
				)}

				{/* Chart area */}
				<div className='p-4 bg-background'>
					<ResponsiveContainer width='100%' height={getChartHeight()}>
						{chartContent || <div>Unsupported chart type</div>}
					</ResponsiveContainer>
				</div>
			</div>

			{/* Data Source Accordion */}
			<div className='mt-2 border rounded-lg overflow-hidden'>
				<button
					onClick={() => setShowDataSource(!showDataSource)}
					className='w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors'
				>
					<span className='flex items-center gap-2'>
						{showDataSource ? (
							<IconChevronUp className='w-4 h-4' />
						) : (
							<IconChevronDown className='w-4 h-4' />
						)}
						{t('dataSource')} ({data.length} {t('rows')})
					</span>
					<button
						onClick={(e) => {
							e.stopPropagation()
							downloadCSV()
						}}
						className='flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent transition-colors cursor-pointer'
					>
						<IconDownload className='w-3.5 h-3.5' />
						CSV
					</button>
				</button>

				{showDataSource && (
					<div className='border-t max-h-64 overflow-auto'>
						<table className='w-full text-xs'>
							<thead className='bg-muted/50 sticky top-0'>
								<tr>
									{Object.keys(data[0] || {}).map(col => (
										<th key={col} className='px-3 py-2 text-left font-medium'>
											{formatFieldName(col)}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.map((row, i) => (
									<tr key={i} className='border-t hover:bg-muted/30'>
										{Object.keys(data[0] || {}).map(col => (
											<td key={col} className='px-3 py-2'>
												{formatNumber(row[col] as number) || String(row[col] ?? '—')}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}

// === Table Display Component ===

interface TableDisplayProps {
	data: Record<string, unknown>[]
	columns?: string[]
	title?: string
}

export function TableDisplay({ data, columns, title }: TableDisplayProps) {
	const t = useTranslations('chat.message')
	const displayColumns = columns || Object.keys(data[0] || {})

	const formatCellValue = (value: unknown): string => {
		if (value === null || value === undefined) return '—'
		if (typeof value === 'number') return formatNumber(value)
		if (typeof value === 'boolean') return value ? t('yes') : t('no')
		if (typeof value === 'object') return JSON.stringify(value)
		return String(value)
	}

	return (
		<div className='w-full bg-card rounded-lg p-4 my-2 overflow-x-auto border'>
			{title && (
				<h3 className='text-lg font-semibold text-foreground mb-4'>{title}</h3>
			)}
			<table className='w-full text-sm text-left text-muted-foreground'>
				<thead className='text-xs uppercase bg-muted text-muted-foreground'>
					<tr>
						{displayColumns.map(col => (
							<th key={col} className='px-4 py-3 font-medium'>
								{formatFieldName(col)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{data.map((row, rowIndex) => (
						<tr
							key={rowIndex}
							className='border-b border-border hover:bg-muted/50 transition-colors'
						>
							{displayColumns.map(col => (
								<td key={col} className='px-4 py-3'>
									{formatCellValue(row[col])}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{data.length > 10 && (
				<p className='text-xs text-muted-foreground mt-2 text-center'>
					{t('showingRecords', { count: data.length })}
				</p>
			)}
		</div>
	)
}

// === Code Display Component ===

interface CodeDisplayProps {
	code: string
	language?: string
}

export function CodeDisplay({ code, language = 'sql' }: CodeDisplayProps) {
	const t = useTranslations('chat.message')
	return (
		<div className='w-full bg-card rounded-lg my-2 overflow-hidden border'>
			<div className='flex items-center justify-between px-4 py-2 bg-muted border-b border-border'>
				<span className='text-xs text-muted-foreground uppercase'>
					{language}
				</span>
				<Button
					variant='ghost'
					size='sm'
					onClick={() => navigator.clipboard.writeText(code)}
					className='h-7 text-xs'
				>
					<IconCopy className='w-3 h-3 mr-1' />
					{t('copy')}
				</Button>
			</div>
			<pre className='p-4 overflow-x-auto text-sm'>
				<code className='text-green-500 dark:text-green-400'>{code}</code>
			</pre>
		</div>
	)
}

// === Parse Plain Text Tables ===

function parseTextTable(content: string): { before: string; tableData: string[][] | null; after: string } {
	// Guard against null/undefined content
	if (!content) {
		return { before: '', tableData: null, after: '' }
	}
	// Try to detect table-like structure in plain text
	const lines = content.split('\n')
	let tableStart = -1
	let tableEnd = -1

	// Find potential table by looking for aligned columns
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim()
		// Skip empty lines
		if (!line) continue

		// Check if line looks like a header (has multiple words separated by spaces/tabs)
		const parts = line.split(/\s{2,}|\t+/).filter(p => p.trim())
		if (parts.length >= 2) {
			if (tableStart === -1) {
				// Check if this could be a header
				const nextLine = lines[i + 1]?.trim()
				if (nextLine) {
					const nextParts = nextLine.split(/\s{2,}|\t+/).filter(p => p.trim())
					if (nextParts.length >= 2) {
						tableStart = i
					}
				}
			}
			tableEnd = i
		} else if (tableStart !== -1 && line && !line.match(/^\d|^[А-Яа-яA-Za-z]/)) {
			// Non-table content after table started
			break
		}
	}

	if (tableStart === -1 || tableEnd - tableStart < 1) {
		return { before: content, tableData: null, after: '' }
	}

	// Extract table data
	const tableLines = lines.slice(tableStart, tableEnd + 1)
	const tableData: string[][] = []

	for (const line of tableLines) {
		const trimmed = line.trim()
		if (!trimmed) continue
		const cells = trimmed.split(/\s{2,}|\t+/).map(c => c.trim()).filter(c => c)
		if (cells.length >= 2) {
			tableData.push(cells)
		}
	}

	if (tableData.length < 2) {
		return { before: content, tableData: null, after: '' }
	}

	const before = lines.slice(0, tableStart).join('\n').trim()
	const after = lines.slice(tableEnd + 1).join('\n').trim()

	return { before, tableData, after }
}

// === Parsed Table Component ===

function ParsedTableDisplay({ data }: { data: string[][] }) {
	if (data.length === 0) return null

	const headers = data[0]
	const rows = data.slice(1)

	return (
		<div className='w-full overflow-x-auto my-3'>
			<table className='w-full border-collapse border border-border rounded-lg overflow-hidden'>
				<thead>
					<tr>
						{headers.map((header, i) => (
							<th
								key={i}
								className='px-4 py-2.5 text-left font-semibold bg-muted border border-border'
							>
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, rowIndex) => (
						<tr key={rowIndex} className='hover:bg-muted/50 transition-colors'>
							{headers.map((_, colIndex) => (
								<td
									key={colIndex}
									className='px-4 py-2 border border-border'
								>
									{row[colIndex] || '—'}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

// === Main Message Component ===

interface ChatMessageDisplayProps {
	message: ChatMessage
	onResend?: (messageId: string) => void
	onEdit?: (messageId: string, newContent: string) => void
	isLoading?: boolean
	previousUserMessageId?: string
}

export function ChatMessageDisplay({
	message,
	onResend,
	onEdit,
	isLoading,
	previousUserMessageId,
}: ChatMessageDisplayProps) {
	const t = useTranslations('chat.message')
	const locale = useLocale()
	const isUser = message.role === 'user'
	const metadata = message.metadata || {}
	const [isExpanded, setIsExpanded] = useState(false)

	// Check if message is long and should be truncated
	const isLongMessage = message.content.length > MAX_MESSAGE_LENGTH
	const displayContent = isLongMessage && !isExpanded
		? message.content.slice(0, MAX_MESSAGE_LENGTH) + '...'
		: message.content
	const hasError = !!metadata.error
	const [isEditing, setIsEditing] = useState(false)
	const [editContent, setEditContent] = useState(message.content)
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(message.content)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleSaveEdit = () => {
		if (editContent.trim() && onEdit) {
			onEdit(message.id, editContent.trim())
			setIsEditing(false)
		}
	}

	const handleCancelEdit = () => {
		setEditContent(message.content)
		setIsEditing(false)
	}

	const renderContent = () => {
		// User messages - dark text on orange background
		if (isUser && !isEditing) {
			return (
				<div>
					<div className='text-orange-950 dark:text-orange-100 whitespace-pre-wrap break-words'>
						{displayContent}
					</div>
					{isLongMessage && (
						<button
							onClick={() => setIsExpanded(!isExpanded)}
							className='mt-2 text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1'
						>
							{isExpanded ? (
								<>
									<IconChevronUp className='w-3 h-3' />
									{t('showLess')}
								</>
							) : (
								<>
									<IconChevronDown className='w-3 h-3' />
									{t('showMore')}
								</>
							)}
						</button>
					)}
				</div>
			)
		}

		// Editing mode
		if (isEditing && isUser) {
			return (
				<div className='space-y-2'>
					<Textarea
						value={editContent}
						onChange={e => setEditContent(e.target.value)}
						className='min-h-[80px] bg-orange-200 border-orange-300 text-orange-950 placeholder:text-orange-400'
						autoFocus
					/>
					<div className='flex justify-end gap-2'>
						<Button
							size='sm'
							variant='ghost'
							onClick={handleCancelEdit}
							className='h-7 text-orange-700 hover:text-orange-950 hover:bg-orange-200'
						>
							<IconX className='w-4 h-4 mr-1' />
							{t('cancel')}
						</Button>
						<Button
							size='sm'
							onClick={handleSaveEdit}
							disabled={!editContent.trim()}
							className='h-7 bg-orange-600 text-white hover:bg-orange-700'
						>
							<IconCheck className='w-4 h-4 mr-1' />
							{t('send')}
						</Button>
					</div>
				</div>
			)
		}

		// Report link content
		if (message.content_type === 'report_link' && metadata.report_id && metadata.report_url && metadata.preview) {
			return (
				<>
					<div className='prose prose-sm dark:prose-invert max-w-none mb-2 prose-p:my-1 prose-strong:text-inherit'>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
					</div>
					<ReportCard
						reportId={metadata.report_id}
						reportUrl={metadata.report_url}
						preview={metadata.preview}
					/>
				</>
			)
		}

		// Chart content - support both string and object visualization format
		const visualizationType = typeof metadata.visualization === 'string'
			? metadata.visualization
			: metadata.visualization?.type

		if (
			message.content_type === 'chart' &&
			metadata.data &&
			visualizationType
		) {
			// Normalize chart type - ChartDisplay expects 'bar_chart', 'line_chart', 'pie_chart'
			const chartTypeMap: Record<string, string> = {
				'bar': 'bar_chart',
				'line': 'line_chart',
				'pie': 'pie_chart',
				'bar_chart': 'bar_chart',
				'line_chart': 'line_chart',
				'pie_chart': 'pie_chart',
			}
			const chartType = chartTypeMap[visualizationType] || 'bar_chart'
			const chartTitle = typeof metadata.visualization === 'object' ? metadata.visualization.title : undefined

			return (
				<>
					<div className='prose prose-sm dark:prose-invert max-w-none mb-4 prose-p:my-1 prose-strong:text-inherit'>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
					</div>
					<ChartDisplay
						data={metadata.data}
						chartType={chartType}
						config={{
							title: chartTitle,
							xKey: metadata.columns?.[0] || Object.keys(metadata.data[0] || {})[0],
							yKey: metadata.columns?.[1] || Object.keys(metadata.data[0] || {})[1],
						}}
					/>
					{metadata.sql_executed && (
						<CodeDisplay code={metadata.sql_executed} language='sql' />
					)}
				</>
			)
		}

		// Table content
		if (message.content_type === 'table' && metadata.data) {
			const tableTitle = typeof metadata.visualization === 'object' ? metadata.visualization?.title : undefined
			return (
				<>
					<div className='prose prose-sm dark:prose-invert max-w-none mb-4 prose-p:my-1 prose-strong:text-inherit'>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
					</div>
					<TableDisplay
						data={metadata.data}
						title={tableTitle}
					/>
					{metadata.sql_executed && (
						<CodeDisplay code={metadata.sql_executed} language='sql' />
					)}
				</>
			)
		}

		// Text content (with optional SQL)
		// Try to parse plain text tables
		const { before, tableData, after } = parseTextTable(message.content)

		if (tableData) {
			// Content has a parseable table
			return (
				<>
					{before && (
						<div className='prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-inherit [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_table]:rounded-lg [&_table]:overflow-hidden [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-muted [&_th]:border [&_th]:border-border [&_td]:px-4 [&_td]:py-2 [&_td]:border [&_td]:border-border [&_tr:hover]:bg-muted/50'>
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{before}</ReactMarkdown>
						</div>
					)}
					<ParsedTableDisplay data={tableData} />
					{after && (
						<div className='prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-inherit'>
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{after}</ReactMarkdown>
						</div>
					)}
					{metadata.sql_executed && (
						<details className='mt-3'>
							<summary className='text-xs text-muted-foreground cursor-pointer hover:text-foreground'>
								{t('showSql')}
							</summary>
							<CodeDisplay code={metadata.sql_executed} language='sql' />
						</details>
					)}
				</>
			)
		}

		// Regular text content without detectable table
		return (
			<>
				<div className='prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-inherit [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_table]:rounded-lg [&_table]:overflow-hidden [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-muted [&_th]:border [&_th]:border-border [&_td]:px-4 [&_td]:py-2 [&_td]:border [&_td]:border-border [&_tr:hover]:bg-muted/50'>
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
				</div>
				{metadata.sql_executed && (
					<details className='mt-3'>
						<summary className='text-xs text-muted-foreground cursor-pointer hover:text-foreground'>
							{t('showSql')}
						</summary>
						<CodeDisplay code={metadata.sql_executed} language='sql' />
					</details>
				)}
			</>
		)
	}

	// Check if message contains chart or table for wider display
	const hasVisualization = message.content_type === 'chart' || message.content_type === 'table'

	return (
		<div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
			<div
				className={`rounded-2xl px-4 py-3 ${
					hasVisualization && !isUser
						? 'w-full max-w-4xl'
						: 'max-w-[85%]'
				} ${
					isUser
						? 'bg-orange-100 dark:bg-orange-900/30 rounded-br-md border border-orange-200 dark:border-orange-800'
						: hasError
							? 'bg-red-50 dark:bg-red-950 text-foreground rounded-bl-md border border-red-200 dark:border-red-800'
							: 'bg-muted text-foreground rounded-bl-md'
				}`}
			>
				{renderContent()}

				{/* Metadata footer */}
				<div
					className={`flex items-center justify-between mt-2 pt-2 ${
						isUser
							? 'border-t border-orange-200/50 dark:border-orange-700/50'
							: hasError
								? 'border-t border-red-200/50 dark:border-red-800/50'
								: 'border-t border-border/50'
					}`}
				>
					<span
						className={`text-xs ${
							isUser
								? 'text-orange-600 dark:text-orange-400'
								: hasError
									? 'text-red-500 dark:text-red-400'
									: 'text-muted-foreground'
						}`}
					>
						{formatDateTime(message.created_at, locale)}
					</span>

					<div className='flex items-center gap-2'>
						{metadata.execution_time_ms && (
							<span className='text-xs text-muted-foreground'>
								{metadata.execution_time_ms}ms • {metadata.rows_count || 0} rows
							</span>
						)}

						{/* Action buttons for user messages */}
						{isUser && !isEditing && !isLoading && (
							<div className='flex items-center gap-1'>
								<button
									onClick={handleCopy}
									className='h-6 w-6 p-0 flex items-center justify-center text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 rounded transition-colors'
									title={t('copy')}
								>
									{copied ? <IconCheck className='w-3.5 h-3.5' /> : <IconCopy className='w-3.5 h-3.5' />}
								</button>
								<button
									onClick={() => setIsEditing(true)}
									className='h-6 w-6 p-0 flex items-center justify-center text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 rounded transition-colors'
									title={t('edit')}
								>
									<IconPencil className='w-3.5 h-3.5' />
								</button>
								<button
									onClick={() => onResend?.(message.id)}
									className='h-6 w-6 p-0 flex items-center justify-center text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 rounded transition-colors'
									title={t('resend')}
								>
									<IconRefresh className='w-3.5 h-3.5' />
								</button>
							</div>
						)}

						{/* Copy button for assistant messages */}
						{!isUser && !hasError && (
							<div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
								<Button
									size='sm'
									variant='ghost'
									onClick={handleCopy}
									className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-accent'
									title={t('copy')}
								>
									{copied ? <IconCheck className='w-3.5 h-3.5' /> : <IconCopy className='w-3.5 h-3.5' />}
								</Button>
							</div>
						)}

						{/* Retry button for error messages */}
						{hasError && !isLoading && previousUserMessageId && (
							<Button
								size='sm'
								variant='ghost'
								onClick={() => onResend?.(previousUserMessageId)}
								className='h-6 px-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900'
							>
								<IconRefresh className='w-3.5 h-3.5 mr-1' />
								{t('retry')}
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

// === Loading Indicator ===

export function LoadingMessage() {
	const t = useTranslations('chat.message')
	return (
		<div className='flex justify-start mb-4'>
			<div className='bg-muted rounded-2xl rounded-bl-md px-4 py-3'>
				<div className='flex items-center space-x-2'>
					<div className='flex space-x-1'>
						<div
							className='w-2 h-2 bg-orange-500 rounded-full animate-bounce'
							style={{ animationDelay: '0ms' }}
						/>
						<div
							className='w-2 h-2 bg-orange-500 rounded-full animate-bounce'
							style={{ animationDelay: '150ms' }}
						/>
						<div
							className='w-2 h-2 bg-orange-500 rounded-full animate-bounce'
							style={{ animationDelay: '300ms' }}
						/>
					</div>
					<span className='text-sm text-muted-foreground'>{t('analyzing')}</span>
				</div>
			</div>
		</div>
	)
}
