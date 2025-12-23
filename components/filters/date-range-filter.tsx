'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchMinCreatedDate } from '@/lib/actions/dashboard-actions'
import type { DateFilterMode } from '@/lib/supabase/types'
import { IconLoader2 } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface DateRangeFilterProps {
	from: Date
	to: Date
	onChange: (from: Date, to: Date) => void
	dateFilterMode?: DateFilterMode
	onDateFilterModeChange?: (mode: DateFilterMode) => void
}

/**
 * Date Range Filter - Quick date range selection
 *
 * Features:
 * - Quick buttons (7d, 30d, 3m, all)
 * - Manual date inputs
 */
export function DateRangeFilter({
	from,
	to,
	onChange,
	dateFilterMode = 'created',
	onDateFilterModeChange,
}: DateRangeFilterProps) {
	const t = useTranslations()
	const [isClient, setIsClient] = useState(false)
	const [isLoadingAllTime, setIsLoadingAllTime] = useState(false)

	// Local state for pending date changes
	const [pendingFrom, setPendingFrom] = useState(from)
	const [pendingTo, setPendingTo] = useState(to)

	// Track if there are unsaved changes
	const hasChanges = pendingFrom.getTime() !== from.getTime() || pendingTo.getTime() !== to.getTime()

	// Avoid hydration mismatch by only rendering dates on client
	useEffect(() => {
		setIsClient(true)
	}, [])

	// Update pending dates when props change (e.g., from quick buttons or external reset)
	useEffect(() => {
		setPendingFrom(from)
		setPendingTo(to)
	}, [from, to])

	// Helper to check if current range matches a preset
	const isActiveRange = (days: number | 'all') => {
		if (!isClient) return false

		const now = new Date()
		const diffMs = to.getTime() - from.getTime()
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

		if (days === 'all') {
			// "All time" is active only if it doesn't match any standard preset
			// This means it's either custom dates or from database minimum date
			const is7d = Math.abs(diffDays - 7) <= 1
			const is30d = Math.abs(diffDays - 30) <= 1
			const is90d = Math.abs(diffDays - 90) <= 2 // Slightly larger tolerance for 3 months

			const result = !is7d && !is30d && !is90d

			

			// Active only if it doesn't match any preset
			return result
		}

		// For numeric days, use tolerance based on the period
		// 3 months (90 days) gets slightly larger tolerance due to month length variations
		const tolerance = days === 90 ? 2 : 1
		const result = Math.abs(diffDays - days) <= tolerance

		

		return result
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

		const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
		

		onChange(start, end)
	}

	const setAllTime = async () => {
		setIsLoadingAllTime(true)
		try {
			const end = new Date()
			end.setHours(23, 59, 59, 999) // End of today
			const start = await fetchMinCreatedDate()
			start.setHours(0, 0, 0, 0) // Start of day

			const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
			

			onChange(start, end)
		} catch (error) {
			console.error('Error fetching min date:', error)
			// Fallback to hardcoded date
			const end = new Date()
			end.setHours(23, 59, 59, 999)
			const start = new Date('2020-01-01')
			start.setHours(0, 0, 0, 0)
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

	// Handle input change (update pending state only)
	const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newFrom = new Date(e.target.value)
		if (!isNaN(newFrom.getTime())) {
			setPendingFrom(newFrom)
		}
	}

	const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTo = new Date(e.target.value)
		if (!isNaN(newTo.getTime())) {
			setPendingTo(newTo)
		}
	}

	// Apply pending changes
	const handleApply = () => {
		onChange(pendingFrom, pendingTo)
	}

	// Cancel pending changes
	const handleCancel = () => {
		setPendingFrom(from)
		setPendingTo(to)
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
							value={formatDateForInput(pendingFrom)}
							onChange={handleFromChange}
							max={formatDateForInput(pendingTo)}
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
							value={formatDateForInput(pendingTo)}
							onChange={handleToChange}
							min={formatDateForInput(pendingFrom)}
							max={formatDateForInput(new Date())}
							className='h-9 text-xs w-auto'
						/>
					</div>

					{/* Date Filter Mode Toggle - next to dates */}
					{onDateFilterModeChange && (
						<div className='flex items-center gap-2 ml-2'>
							<span
								className={`text-xs ${dateFilterMode === 'created' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
							>
								{t('filters.dateMode.created')}
							</span>
							<button
								type='button'
								role='switch'
								aria-checked={dateFilterMode === 'human_reply'}
								onClick={() =>
									onDateFilterModeChange(
										dateFilterMode === 'created' ? 'human_reply' : 'created'
									)
								}
								className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
									dateFilterMode === 'human_reply'
										? 'bg-orange-500'
										: 'bg-muted'
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
										dateFilterMode === 'human_reply'
											? 'translate-x-5'
											: 'translate-x-0'
									}`}
								/>
							</button>
							<span
								className={`text-xs ${dateFilterMode === 'human_reply' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
							>
								{t('filters.dateMode.humanReply')}
							</span>
						</div>
					)}

					{/* Apply/Cancel buttons - only show when there are changes */}
					{hasChanges && (
						<>
							<Button
								onClick={handleApply}
								size='sm'
								className='h-9 px-3 text-xs bg-orange-500 hover:bg-orange-600'
							>
								{t('common.apply')}
							</Button>
							<Button
								onClick={handleCancel}
								variant='outline'
								size='sm'
								className='h-9 px-3 text-xs'
							>
								{t('common.cancel')}
							</Button>
						</>
					)}
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
