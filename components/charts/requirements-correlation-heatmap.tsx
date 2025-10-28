'use client'

import { ResponsiveHeatMap } from '@nivo/heatmap'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CorrelationCell } from '@/lib/supabase/types'
import { useTheme } from 'next-themes'
import { getRequirement } from '@/constants/requirement-types'

interface RequirementsCorrelationHeatmapProps {
	data: CorrelationCell[]
}

/**
 * Requirements Correlation Heatmap - Shows which requirements co-occur
 *
 * Features:
 * - Heatmap with correlation values
 * - Color intensity = correlation strength
 * - Shows requirement co-occurrence patterns
 */
export function RequirementsCorrelationHeatmap({
	data,
}: RequirementsCorrelationHeatmapProps) {
	const { resolvedTheme } = useTheme()
	const isDark = resolvedTheme === 'dark'

	// Transform data for @nivo/heatmap
	// Group by Y axis (rows)
	const heatmapData = data.reduce(
		(acc, cell) => {
			const existingRow = acc.find((row) => row.id === cell.y)
			const label = getRequirement(cell.x as any)?.shortLabel || cell.x

			if (existingRow) {
				existingRow.data.push({
					x: label,
					y: Math.round(cell.value * 100), // Convert to percentage
				})
			} else {
				acc.push({
					id: cell.y,
					data: [
						{
							x: label,
							y: Math.round(cell.value * 100),
						},
					],
				})
			}
			return acc
		},
		[] as Array<{ id: string; data: Array<{ x: string; y: number }> }>
	)

	// Transform row IDs to short labels
	const transformedData = heatmapData.map((row) => ({
		id: getRequirement(row.id as any)?.shortLabel || row.id,
		data: row.data,
	}))

	if (transformedData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>
						Requirements Correlation
					</CardTitle>
					<CardDescription className='text-sm'>
						How often requirements occur together
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center justify-center h-[300px] text-sm text-muted-foreground'>
						No correlation data available
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className='min-w-0'>
			<CardHeader>
				<CardTitle className='text-lg sm:text-xl'>Requirements Correlation</CardTitle>
				<CardDescription className='text-sm'>
					How often requirements occur together (%)
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<div className='h-[300px] w-full'>
					<ResponsiveHeatMap
						data={transformedData}
						margin={{ top: 60, right: 60, bottom: 60, left: 80 }}
						valueFormat='>-.0f'
						axisTop={{
							tickSize: 5,
							tickPadding: 5,
							tickRotation: -45,
							legend: '',
							legendOffset: 46,
						}}
						axisLeft={{
							tickSize: 5,
							tickPadding: 5,
							tickRotation: 0,
							legend: '',
							legendPosition: 'middle',
							legendOffset: -72,
						}}
						colors={{
							type: 'sequential',
							scheme: 'blues',
						}}
						emptyColor='#555555'
						borderColor={{
							from: 'color',
							modifiers: [['darker', 0.6]],
						}}
						labelTextColor={{
							from: 'color',
							modifiers: [['darker', 2]],
						}}
						legends={[
							{
								anchor: 'bottom',
								translateX: 0,
								translateY: 50,
								length: 200,
								thickness: 10,
								direction: 'row',
								tickPosition: 'after',
								tickSize: 3,
								tickSpacing: 4,
								tickOverlap: false,
								tickFormat: '>-.0s',
								title: 'Co-occurrence %',
								titleAlign: 'start',
								titleOffset: 4,
							},
						]}
						theme={{
							text: {
								fill: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
								fontSize: 11,
							},
							tooltip: {
								container: {
									background: isDark ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)',
									color: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
									fontSize: 12,
									border: '1px solid',
									borderColor: isDark
										? 'hsl(217.2 32.6% 17.5%)'
										: 'hsl(214.3 31.8% 91.4%)',
									borderRadius: '6px',
									padding: '8px 12px',
								},
							},
						}}
					/>
				</div>
			</CardContent>
		</Card>
	)
}
