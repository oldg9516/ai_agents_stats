'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getQualityColor } from '@/lib/utils/quality-colors'
import type { CategoryDistributionData } from '@/lib/supabase/types'

interface CategoryPieChartProps {
	data: CategoryDistributionData[]
	onCategoryClick?: (category: string) => void
}

/**
 * Category Pie Chart - Shows distribution of records by category
 *
 * Features:
 * - Pie chart with quality-based colors
 * - Click on slice to filter dashboard
 * - Shows category name, record count, and percentage
 */
export function CategoryPieChart({ data, onCategoryClick }: CategoryPieChartProps) {
	// Custom label for pie chart
	const renderLabel = (entry: any) => {
		return `${entry.category} (${entry.totalRecords})`
	}

	// Custom tooltip
	const CustomTooltip = ({ active, payload }: any) => {
		if (!active || !payload || !payload.length) return null

		const data = payload[0].payload
		return (
			<div className="bg-background border border-border rounded-lg p-3 shadow-lg">
				<p className="font-medium mb-1">{data.category}</p>
				<p className="text-sm text-muted-foreground">
					Records: <span className="font-medium text-foreground">{data.totalRecords}</span>
				</p>
				<p className="text-sm text-muted-foreground">
					Quality:{' '}
					<span className="font-medium text-foreground">{data.goodPercentage.toFixed(1)}%</span>
				</p>
			</div>
		)
	}

	// Handle click on pie slice
	const handleClick = (entry: CategoryDistributionData) => {
		if (onCategoryClick) {
			onCategoryClick(entry.category)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Quality by Category</CardTitle>
				<CardDescription>Distribution of records across categories with quality levels</CardDescription>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<div className="flex items-center justify-center h-[300px] text-muted-foreground">
						No data available
					</div>
				) : (
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={data}
								dataKey="totalRecords"
								nameKey="category"
								cx="50%"
								cy="50%"
								outerRadius={100}
								label={renderLabel}
								onClick={handleClick}
								style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
							>
								{data.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={getQualityColor(entry.goodPercentage)} />
								))}
							</Pie>
							<Tooltip content={<CustomTooltip />} />
							<Legend
								formatter={(value, entry: any) => {
									const percentage = entry.payload.goodPercentage
									return `${value} (${percentage.toFixed(1)}% quality)`
								}}
							/>
						</PieChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	)
}
