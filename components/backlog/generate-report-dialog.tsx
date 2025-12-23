'use client'

import { useBacklogReportsFilters } from '@/lib/store/hooks'
import { useGenerateReport } from '@/lib/queries/backlog-reports-queries'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Alert, AlertDescription } from '../ui/alert'
import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react'

interface GenerateReportDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * Generate Report Dialog - Modal for triggering new report generation
 *
 * Features:
 * - Radio buttons for period selection (7, 14, 30, custom)
 * - Custom days input
 * - Warning about generation time
 * - Cancel/Generate buttons
 */
export function GenerateReportDialog({
	open,
	onOpenChange,
}: GenerateReportDialogProps) {
	const t = useTranslations()
	const [selectedPeriod, setSelectedPeriod] = useState<string>('7')
	const [customDays, setCustomDays] = useState<string>('')

	const { setIsGeneratingReport } = useBacklogReportsFilters()
	const generateMutation = useGenerateReport()

	// Get the actual period days value
	const getPeriodDays = (): number => {
		if (selectedPeriod === 'custom') {
			const days = parseInt(customDays, 10)
			return isNaN(days) || days < 1 ? 7 : days
		}
		return parseInt(selectedPeriod, 10)
	}

	// Check if form is valid
	const isValid =
		selectedPeriod !== 'custom' ||
		(customDays && parseInt(customDays, 10) > 0)

	// Handle generate
	const handleGenerate = async () => {
		const periodDays = getPeriodDays()

		// Immediately show the generation indicator and close dialog
		console.log('📤 [GenerateDialog] Starting generation for', periodDays, 'days')
		setIsGeneratingReport(true)
		onOpenChange(false)

		// Reset form
		setSelectedPeriod('7')
		setCustomDays('')

		try {
			const result = await generateMutation.mutateAsync(periodDays)
			console.log('📥 [GenerateDialog] Result:', result)

			if (result.success) {
				console.log('✅ [GenerateDialog] Webhook triggered successfully')
				toast.success(t('backlogReports.generate.success'))
			} else {
				console.log('❌ [GenerateDialog] Failed:', result.error)
				toast.error(result.error || t('backlogReports.generate.error'))
				// Stop the indicator on error
				setIsGeneratingReport(false)
			}
		} catch (error) {
			console.error('❌ [GenerateDialog] Exception:', error)
			toast.error(
				error instanceof Error
					? error.message
					: t('backlogReports.generate.error')
			)
			// Stop the indicator on error
			setIsGeneratingReport(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>{t('backlogReports.generate.title')}</DialogTitle>
					<DialogDescription>
						{t('backlogReports.generate.description')}
					</DialogDescription>
				</DialogHeader>

				<div className='grid gap-4 py-4'>
					{/* Period Selection */}
					<div className='space-y-3'>
						<Label>{t('backlogReports.generate.selectPeriod')}</Label>
						<RadioGroup
							value={selectedPeriod}
							onValueChange={setSelectedPeriod}
							className='grid grid-cols-2 gap-2'
						>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='7' id='period-7' />
								<Label htmlFor='period-7' className='font-normal cursor-pointer'>
									7 {t('backlogReports.card.days')}
								</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='14' id='period-14' />
								<Label htmlFor='period-14' className='font-normal cursor-pointer'>
									14 {t('backlogReports.card.days')}
								</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='30' id='period-30' />
								<Label htmlFor='period-30' className='font-normal cursor-pointer'>
									30 {t('backlogReports.card.days')}
								</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='custom' id='period-custom' />
								<Label
									htmlFor='period-custom'
									className='font-normal cursor-pointer'
								>
									{t('backlogReports.generate.customDays')}
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Custom Days Input */}
					{selectedPeriod === 'custom' && (
						<div className='space-y-2'>
							<Label htmlFor='custom-days'>
								{t('backlogReports.generate.enterDays')}
							</Label>
							<Input
								id='custom-days'
								type='number'
								min='1'
								max='365'
								value={customDays}
								onChange={e => setCustomDays(e.target.value)}
								placeholder='e.g. 60'
							/>
						</div>
					)}

					{/* Warning */}
					<Alert variant='default' className='bg-muted'>
						<IconAlertTriangle className='h-4 w-4' />
						<AlertDescription>
							{t('backlogReports.generate.warning')}
						</AlertDescription>
					</Alert>
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => onOpenChange(false)}
						disabled={generateMutation.isPending}
					>
						{t('common.cancel')}
					</Button>
					<Button
						onClick={handleGenerate}
						disabled={!isValid || generateMutation.isPending}
					>
						{generateMutation.isPending ? (
							<>
								<IconLoader2 className='mr-2 h-4 w-4 animate-spin' />
								{t('backlogReports.generate.generating')}
							</>
						) : (
							t('backlogReports.generate.generate')
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
