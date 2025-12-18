'use client'

import { formatNumber } from '@/types/chat'
import { useTranslations } from 'next-intl'
import { formatFieldName } from './chart-display'

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
