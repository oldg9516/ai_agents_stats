'use client'

interface ParsedTableDisplayProps {
	data: string[][]
}

export function ParsedTableDisplay({ data }: ParsedTableDisplayProps) {
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
								<td key={colIndex} className='px-4 py-2 border border-border'>
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
