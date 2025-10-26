'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface DateRangeFilterProps {
	from: Date
	to: Date
	onChange: (from: Date, to: Date) => void
}

/**
 * Date Range Filter - Quick date range selection
 *
 * Features:
 * - Quick buttons (7d, 30d, 3m, all)
 * - Manual date inputs
 */
export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
	// Quick date range handlers
	const setLast7Days = () => {
		const end = new Date()
		const start = new Date()
		start.setDate(end.getDate() - 7)
		onChange(start, end)
	}

	const setLast30Days = () => {
		const end = new Date()
		const start = new Date()
		start.setDate(end.getDate() - 30)
		onChange(start, end)
	}

	const setLast3Months = () => {
		const end = new Date()
		const start = new Date()
		start.setMonth(end.getMonth() - 3)
		onChange(start, end)
	}

	const setAllTime = () => {
		const end = new Date()
		const start = new Date('2020-01-01') // Far past date
		onChange(start, end)
	}

	// Format date for input
	const formatDateForInput = (date: Date) => {
		return date.toISOString().split('T')[0]
	}

	// Handle input change
	const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newFrom = new Date(e.target.value)
		if (!isNaN(newFrom.getTime())) {
			onChange(newFrom, to)
		}
	}

	const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTo = new Date(e.target.value)
		if (!isNaN(newTo.getTime())) {
			onChange(from, newTo)
		}
	}

	return (
		<div className="space-y-3">
			<Label className="text-sm font-medium">Date Range</Label>

			{/* Quick Buttons */}
			<div className="flex flex-wrap gap-2">
				<Button onClick={setLast7Days} variant="outline" size="sm">
					Last 7 days
				</Button>
				<Button onClick={setLast30Days} variant="outline" size="sm">
					Last 30 days
				</Button>
				<Button onClick={setLast3Months} variant="outline" size="sm">
					Last 3 months
				</Button>
				<Button onClick={setAllTime} variant="outline" size="sm">
					All time
				</Button>
			</div>

			{/* Manual Date Inputs */}
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<Label htmlFor="date-from" className="text-xs text-muted-foreground">
						From
					</Label>
					<Input
						id="date-from"
						type="date"
						value={formatDateForInput(from)}
						onChange={handleFromChange}
						max={formatDateForInput(to)}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="date-to" className="text-xs text-muted-foreground">
						To
					</Label>
					<Input
						id="date-to"
						type="date"
						value={formatDateForInput(to)}
						onChange={handleToChange}
						min={formatDateForInput(from)}
						max={formatDateForInput(new Date())}
					/>
				</div>
			</div>
		</div>
	)
}
