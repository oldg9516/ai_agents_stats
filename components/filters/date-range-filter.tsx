'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchMinCreatedDate } from '@/lib/actions/dashboard-actions'
import { IconLoader2 } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

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
	const t = useTranslations()
	const [isClient, setIsClient] = useState(false)
	const [isLoadingAllTime, setIsLoadingAllTime] = useState(false)

	// Avoid hydration mismatch by only rendering dates on client
	useEffect(() => {
		setIsClient(true)
	}, [])

	// Helper to check if current range matches a preset
	const isActiveRange = (days: number | 'all') => {
		if (!isClient) return false

		const now = new Date()
		const diffMs = to.getTime() - from.getTime()
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

		if (days === 'all') {
			// Check if from date is very old (before 2023)
			return from.getFullYear() < 2023
		}

		// Allow 1 day tolerance for date comparison
		return Math.abs(diffDays - days) <= 1
	}

	// Quick date range handlers
	const setLast7Days = () => {
		const end = new Date()
		end.setHours(23, 59, 59, 999) // End of today
		const start = new Date()
		start.setDate(end.getDate() - 6) // Today + 6 days back = 7 days total
		start.setHours(0, 0, 0, 0) // Start of day
		onChange(start, end)
	}

	const setLast30Days = () => {
		const end = new Date()
		end.setHours(23, 59, 59, 999) // End of today
		const start = new Date()
		start.setDate(end.getDate() - 29) // Today + 29 days back = 30 days total
		start.setHours(0, 0, 0, 0) // Start of day
		onChange(start, end)
	}

	const setLast3Months = () => {
		const end = new Date()
		end.setHours(23, 59, 59, 999) // End of today
		const start = new Date()
		start.setMonth(end.getMonth() - 3)
		start.setDate(end.getDate() + 1) // Adjust to include today
		start.setHours(0, 0, 0, 0) // Start of day
		onChange(start, end)
	}

	const setAllTime = async () => {
		setIsLoadingAllTime(true)
		try {
			const end = new Date()
			const start = await fetchMinCreatedDate()
			onChange(start, end)
		} catch (error) {
			console.error('Error fetching min date:', error)
			// Fallback to hardcoded date
			const end = new Date()
			const start = new Date('2020-01-01')
			onChange(start, end)
		} finally {
			setIsLoadingAllTime(false)
		}
	}

	// Format date for input (stable on server and client)
	const formatDateForInput = (date: Date) => {
		if (!isClient) {
			// Return a stable value during SSR to avoid hydration mismatch
			return ''
		}
		try {
			return date.toISOString().split('T')[0]
		} catch {
			return ''
		}
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
		<div className='flex flex-wrap gap-4 sm:items-center'>
			{/* Quick Buttons - Single row */}
			<div className='flex flex-wrap gap-2'>
				<Button
					onClick={setLast7Days}
					variant='outline'
					size='sm'
					className={`text-xs h-9 px-4 ${
						isActiveRange(7)
							? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'
							: ''
					}`}
				>
					{t('filters.quickOptions.7d')}
				</Button>
				<Button
					onClick={setLast30Days}
					variant='outline'
					size='sm'
					className={`text-xs h-9 px-4 ${
						isActiveRange(30)
							? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'
							: ''
					}`}
				>
					{t('filters.quickOptions.30d')}
				</Button>
				<Button
					onClick={setLast3Months}
					variant='outline'
					size='sm'
					className={`text-xs h-9 px-4 ${
						isActiveRange(90)
							? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'
							: ''
					}`}
				>
					{t('filters.quickOptions.3m')}
				</Button>
				<Button
					onClick={setAllTime}
					variant='outline'
					size='sm'
					disabled={isLoadingAllTime}
					className={`text-xs h-9 px-4 ${
						isActiveRange('all')
							? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'
							: ''
					}`}
				>
					{isLoadingAllTime ? (
						<>
							<IconLoader2 className='mr-1 h-3 w-3 animate-spin' />
							Loading...
						</>
					) : (
						t('filters.quickOptions.all')
					)}
				</Button>
			</div>

			{/* Manual Date Inputs - Inline */}
			{isClient && (
				<div className='flex items-center gap-2 flex-wrap'>
					<div className='flex items-center gap-1.5'>
						<Label
							htmlFor='date-from'
							className='text-xs text-muted-foreground whitespace-nowrap'
						>
							{t('filters.from')}
						</Label>
						<Input
							id='date-from'
							type='date'
							value={formatDateForInput(from)}
							onChange={handleFromChange}
							max={formatDateForInput(to)}
							className='h-9 text-xs w-auto'
						/>
					</div>
					<div className='flex items-center gap-1.5'>
						<Label
							htmlFor='date-to'
							className='text-xs text-muted-foreground whitespace-nowrap'
						>
							{t('filters.to')}
						</Label>
						<Input
							id='date-to'
							type='date'
							value={formatDateForInput(to)}
							onChange={handleToChange}
							min={formatDateForInput(from)}
							max={formatDateForInput(new Date())}
							className='h-9 text-xs w-auto'
						/>
					</div>
				</div>
			)}
			{!isClient && (
				<div className='flex items-center gap-2 flex-wrap'>
					<div className='flex items-center gap-1.5'>
						<Label
							htmlFor='date-from'
							className='text-xs text-muted-foreground whitespace-nowrap'
						>
							{t('filters.from')}
						</Label>
						<Input
							id='date-from'
							type='date'
							disabled
							className='h-8 text-xs w-auto'
						/>
					</div>
					<div className='flex items-center gap-1.5'>
						<Label
							htmlFor='date-to'
							className='text-xs text-muted-foreground whitespace-nowrap'
						>
							{t('filters.to')}
						</Label>
						<Input
							id='date-to'
							type='date'
							disabled
							className='h-8 text-xs w-auto'
						/>
					</div>
				</div>
			)}
		</div>
	)
}
