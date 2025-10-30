/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { getRequirement } from '@/constants/requirement-types'
import type { CorrelationCell } from '@/lib/supabase/types'
import { ResponsiveHeatMap } from '@nivo/heatmap'
import { useTranslations } from 'next-intl'

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
	const t = useTranslations()

	// Transform data for @nivo/heatmap
	// Group by Y axis (rows)
	const heatmapData = data.reduce((acc, cell) => {
		const existingRow = acc.find(row => row.id === cell.y)
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
	}, [] as Array<{ id: string; data: Array<{ x: string; y: number }> }>)

	// Transform row IDs to short labels
	const transformedData = heatmapData.map(row => ({
		id: getRequirement(row.id as any)?.shortLabel || row.id,
		data: row.data,
	}))

	if (transformedData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>
						{t('charts.requirementsCorrelation.title')}
					</CardTitle>
					<CardDescription className='text-sm'>
						{t('charts.requirementsCorrelation.description')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center justify-center h-[300px] text-sm text-muted-foreground'>
						{t('common.noDataAvailable')}
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className='min-w-0'>
			<CardHeader>
				<div className='flex items-center gap-1.5'>
					<CardTitle className='text-lg sm:text-xl'>
						{t('charts.requirementsCorrelation.title')}
					</CardTitle>
					<InfoTooltip content={t('charts.requirementsCorrelation.tooltip')} />
				</div>
				<CardDescription className='text-sm'>
					{t('charts.requirementsCorrelation.description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<div className='h-[400px] w-full'>
					<ResponsiveHeatMap
						data={transformedData}
						margin={{ top: 60, right: 60, bottom: 80, left: 80 }}
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
							minValue: 0,
							maxValue: 100,
						}}
						emptyColor='hsl(var(--muted))'
						borderColor={{
							from: 'color',
							modifiers: [['darker', 0.4]],
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
								fill: 'hsl(var(--foreground))',
								fontSize: 11,
							},
							tooltip: {
								container: {
									background: 'hsl(var(--popover))',
									color: 'hsl(var(--popover-foreground))',
									fontSize: 12,
									border: '1px solid',
									borderColor: 'hsl(var(--border))',
									borderRadius: 'var(--radius)',
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
