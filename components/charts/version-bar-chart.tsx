'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getQualityColor } from '@/lib/utils/quality-colors'
import type { VersionComparisonData } from '@/lib/supabase/types'

interface VersionBarChartProps {
	data: VersionComparisonData[]
}

/**
 * Version Bar Chart - Shows quality comparison across prompt versions
 *
 * Features:
 * - Bar chart with quality-based colors
 * - Shows version and quality percentage
 * - Color-coded bars (red/yellow/green)
 */
export function VersionBarChart({ data }: VersionBarChartProps) {
	// Sort data by version
	const sortedData = [...data].sort((a, b) => {
		// Extract version number (e.g., "v1" -> 1)
		const getVersionNum = (version: string) => {
			const match = version.match(/\d+/)
			return match ? parseInt(match[0]) : 0
		}
		return getVersionNum(a.version) - getVersionNum(b.version)
	})

	// Custom tooltip
	const CustomTooltip = ({ active, payload }: any) => {
		if (!active || !payload || !payload.length) return null

		const data = payload[0].payload
		return (
			<div className="bg-background border border-border rounded-lg p-3 shadow-lg">
				<p className="font-medium mb-1">{data.version}</p>
				<p className="text-sm text-muted-foreground">
					Quality:{' '}
					<span className="font-medium text-foreground">{data.goodPercentage.toFixed(1)}%</span>
				</p>
				<p className="text-sm text-muted-foreground">
					Records: <span className="font-medium text-foreground">{data.totalRecords}</span>
				</p>
			</div>
		)
	}

	// Custom bar label
	const renderBarLabel = (props: any) => {
		const { x, y, width, height, value } = props
		return (
			<text
				x={x + width / 2}
				y={y + height / 2}
				fill="white"
				textAnchor="middle"
				dominantBaseline="middle"
				className="text-sm font-medium"
			>
				{value.toFixed(1)}%
			</text>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg sm:text-xl">Version Comparison</CardTitle>
				<CardDescription className="text-sm">
					Quality percentage across different versions
				</CardDescription>
			</CardHeader>
			<CardContent>
				{sortedData.length === 0 ? (
					<div className="flex items-center justify-center h-[250px] sm:h-[300px] text-sm text-muted-foreground">
						No data available
					</div>
				) : (
					<>
						<ResponsiveContainer width="100%" height={250} className="sm:hidden">
							<BarChart data={sortedData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis
									dataKey="version"
									className="text-[10px] text-muted-foreground"
									tick={{ fontSize: 10 }}
								/>
								<YAxis
									domain={[0, 100]}
									tickFormatter={(value) => `${value}%`}
									className="text-[10px] text-muted-foreground"
									tick={{ fontSize: 10 }}
								/>
								<Tooltip content={<CustomTooltip />} />
								<Bar
									dataKey="goodPercentage"
									radius={[6, 6, 0, 0]}
								>
									{sortedData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={getQualityColor(entry.goodPercentage)} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
						<ResponsiveContainer width="100%" height={300} className="hidden sm:block">
							<BarChart data={sortedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis
									dataKey="version"
									className="text-xs text-muted-foreground"
								/>
								<YAxis
									domain={[0, 100]}
									tickFormatter={(value) => `${value}%`}
									className="text-xs text-muted-foreground"
								/>
								<Tooltip content={<CustomTooltip />} />
								<Bar
									dataKey="goodPercentage"
									radius={[8, 8, 0, 0]}
									label={renderBarLabel}
								>
									{sortedData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={getQualityColor(entry.goodPercentage)} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</>
				)}
			</CardContent>
		</Card>
	)
}
