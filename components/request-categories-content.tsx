'use client'

import { RequestCategoriesTable } from '@/components/tables/request-categories-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchSupportMinCreatedDate } from '@/lib/actions/support-actions'
import { IconLoader2 } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

/**
 * Request Categories Content - Client Component
 *
 * Shows breakdown of all request types and subtypes with counts and percentages
 * Filterable by date range
 */
export function RequestCategoriesContent() {
	const t = useTranslations('filters')
	const tCommon = useTranslations('common')

	// Date range state - default to last 30 days
	const defaultTo = new Date()
	const defaultFrom = new Date()
	defaultFrom.setDate(defaultFrom.getDate() - 30)

	const [dateRange, setDateRange] = useState({
		from: defaultFrom,
		to: defaultTo,
	})

	const [isLoadingAllTime, setIsLoadingAllTime] = useState(false)

	// Helper to check if current range matches a preset
	const isActiveRange = (days: number | 'all') => {
		const diffMs = dateRange.to.getTime() - dateRange.from.getTime()
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

		if (days === 'all') {
			// Check if from date is very old (before 2023)
			return dateRange.from.getFullYear() < 2023
		}

		// Allow 1 day tolerance for date comparison
		return Math.abs(diffDays - days) <= 1
	}

	// Quick date setters
	const set7Days = () => {
		const end = new Date()
		const start = new Date()
		start.setDate(end.getDate() - 7)
		setDateRange({ from: start, to: end })
	}

	const set30Days = () => {
		const end = new Date()
		const start = new Date()
		start.setDate(end.getDate() - 30)
		setDateRange({ from: start, to: end })
	}

	const set3Months = () => {
		const end = new Date()
		const start = new Date()
		start.setMonth(end.getMonth() - 3)
		setDateRange({ from: start, to: end })
	}

	const setAllTime = async () => {
		setIsLoadingAllTime(true)
		try {
			const end = new Date()
			const start = await fetchSupportMinCreatedDate()
			setDateRange({ from: start, to: end })
		} catch (error) {
			console.error('Error fetching min date:', error)
			// Fallback
			const end = new Date()
			const start = new Date('2024-01-01')
			setDateRange({ from: start, to: end })
		} finally {
			setIsLoadingAllTime(false)
		}
	}

	// Format date for input
	const formatDateForInput = (date: Date) => {
		return date.toISOString().split('T')[0]
	}

	// Handle manual date change
	const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newFrom = new Date(e.target.value)
		if (!isNaN(newFrom.getTime())) {
			setDateRange({ from: newFrom, to: dateRange.to })
		}
	}

	const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTo = new Date(e.target.value)
		if (!isNaN(newTo.getTime())) {
			setDateRange({ from: dateRange.from, to: newTo })
		}
	}

	return (
		<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
			{/* Date Filter */}
			<div className='flex flex-wrap gap-3'>
				{/* Quick buttons - compact, inline */}
				<div className='flex flex-wrap gap-2'>
					<Button
						variant='outline'
						size='sm'
						onClick={set7Days}
						className={`h-8 px-3 text-xs ${
							isActiveRange(7)
								? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'
								: ''
						}`}
					>
						{t('quickOptions.7d')}
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={set30Days}
						className={`h-8 px-3 text-xs ${
							isActiveRange(30)
								? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'
								: ''
						}`}
					>
						{t('quickOptions.30d')}
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={set3Months}
						className={`h-8 px-3 text-xs ${
							isActiveRange(90)
								? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'
								: ''
						}`}
					>
						{t('quickOptions.3m')}
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={setAllTime}
						disabled={isLoadingAllTime}
						className={`h-8 px-3 text-xs ${
							isActiveRange('all')
								? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'
								: ''
						}`}
					>
						{isLoadingAllTime ? (
							<>
								<IconLoader2 className='mr-2 h-3 w-3 animate-spin' />
								{tCommon('loading')}
							</>
						) : (
							t('quickOptions.all')
						)}
					</Button>
				</div>

				{/* Manual date inputs - inline layout */}
				<div className='flex items-center gap-2 flex-wrap'>
					<div className='flex items-center gap-1.5'>
						<Label
							htmlFor='from'
							className='text-xs text-muted-foreground whitespace-nowrap'
						>
							{t('from')}
						</Label>
						<Input
							id='from'
							type='date'
							className='h-8 text-xs w-auto'
							value={formatDateForInput(dateRange.from)}
							onChange={handleFromChange}
						/>
					</div>
					<div className='flex items-center gap-1.5'>
						<Label
							htmlFor='to'
							className='text-xs text-muted-foreground whitespace-nowrap'
						>
							{t('to')}
						</Label>
						<Input
							id='to'
							type='date'
							className='h-8 text-xs w-auto'
							value={formatDateForInput(dateRange.to)}
							onChange={handleToChange}
						/>
					</div>
				</div>
			</div>

			{/* Request Categories Table - handles its own data fetching */}
			<RequestCategoriesTable dateRange={dateRange} />
		</div>
	)
}
