'use client'

import { Button } from '@/components/ui/button'
import { CHART_COLORS, formatNumber } from '@/types/chat'
import { IconChevronDown, IconChevronUp, IconDownload } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import {
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

// Format field names: snake_case/camelCase → readable text
export function formatFieldName(name: string): string {
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
				headers
					.map(h => {
						const val = row[h]
						const strVal = String(val ?? '')
						if (strVal.includes(',') || strVal.includes('"')) {
							return `"${strVal.replace(/"/g, '""')}"`
						}
						return strVal
					})
					.join(',')
			),
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
			const legendRows = Math.ceil(data.length / 3)
			return 400 + legendRows * 25
		}
		return 350
	}

	return (
		<div className='w-full rounded-lg my-2'>
			{/* Chart with title bar */}
			<div className='border rounded-lg overflow-hidden'>
				{config?.title && (
					<div className='flex items-center gap-2 px-4 py-3 border-b bg-muted/30'>
						<div className='w-1 h-5 bg-primary rounded-full' />
						<h3 className='text-base font-semibold text-foreground'>
							{config.title}
						</h3>
					</div>
				)}

				<div className='p-4 bg-background'>
					<ResponsiveContainer width='100%' height={getChartHeight()}>
						{chartContent || <div>Unsupported chart type</div>}
					</ResponsiveContainer>
				</div>
			</div>

			{/* Data Source Accordion */}
			<div className='mt-2 border rounded-lg overflow-hidden'>
				<div className='flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground'>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => setShowDataSource(!showDataSource)}
						className='flex items-center gap-2 p-0 h-auto hover:bg-transparent'
					>
						{showDataSource ? (
							<IconChevronUp className='w-4 h-4' />
						) : (
							<IconChevronDown className='w-4 h-4' />
						)}
						{t('dataSource')} ({data.length} {t('rows')})
					</Button>
					<Button
						variant='ghost'
						size='sm'
						onClick={downloadCSV}
						className='flex items-center gap-1 px-2 py-1 text-xs h-auto'
					>
						<IconDownload className='w-3.5 h-3.5' />
						CSV
					</Button>
				</div>

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
												{formatNumber(row[col] as number) ||
													String(row[col] ?? '—')}
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
