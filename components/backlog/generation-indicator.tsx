'use client'

import { useStore } from '@/lib/store'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { IconSparkles, IconX, IconBrain, IconDatabase, IconFileAnalytics } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

/**
 * Generation steps with icons and estimated durations
 */
const GENERATION_STEPS = [
	{ id: 'fetching', icon: IconDatabase, durationMs: 30000 },
	{ id: 'analyzing', icon: IconBrain, durationMs: 120000 },
	{ id: 'generating', icon: IconFileAnalytics, durationMs: 60000 },
] as const

type StepId = typeof GENERATION_STEPS[number]['id']

/**
 * Generation Indicator - Animated banner showing report generation progress
 */
export function GenerationIndicator() {
	const t = useTranslations()
	const { isGeneratingReport, generationStartedAt, setIsGeneratingReport } = useStore()

	const [elapsedMs, setElapsedMs] = useState(0)
	const [currentStep, setCurrentStep] = useState<StepId>('fetching')
	const [progress, setProgress] = useState(0)

	// Update elapsed time every second
	useEffect(() => {
		if (!isGeneratingReport || !generationStartedAt) {
			setElapsedMs(0)
			setCurrentStep('fetching')
			setProgress(0)
			return
		}

		const interval = setInterval(() => {
			const startedAt = new Date(generationStartedAt).getTime()
			const elapsed = Date.now() - startedAt
			setElapsedMs(elapsed)

			// Determine current step based on elapsed time
			let cumulativeTime = 0
			let totalDuration = GENERATION_STEPS.reduce((sum, step) => sum + step.durationMs, 0)

			for (const step of GENERATION_STEPS) {
				cumulativeTime += step.durationMs
				if (elapsed < cumulativeTime) {
					setCurrentStep(step.id)
					break
				}
			}

			// Calculate overall progress (cap at 95% until actually complete)
			const rawProgress = (elapsed / totalDuration) * 100
			setProgress(Math.min(rawProgress, 95))
		}, 1000)

		return () => clearInterval(interval)
	}, [isGeneratingReport, generationStartedAt])

	// Format elapsed time
	const formatElapsed = (ms: number) => {
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60

		if (minutes > 0) {
			return `${minutes}m ${remainingSeconds}s`
		}
		return `${seconds}s`
	}

	// Cancel generation tracking (doesn't stop the actual process)
	const handleCancel = () => {
		setIsGeneratingReport(false)
	}

	// Debug log
	console.log('🔄 [GenerationIndicator] isGeneratingReport:', isGeneratingReport, 'generationStartedAt:', generationStartedAt)

	if (!isGeneratingReport) {
		return null
	}

	return (
		<Card className='relative overflow-hidden border-primary/50 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5'>
			{/* Animated background effect */}
			<div className='absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer' />

			<CardContent className='relative p-4'>
				<div className='flex items-center gap-4'>
					{/* Animated icon */}
					<div className='relative'>
						<div className='absolute inset-0 rounded-full bg-primary/20 animate-ping' />
						<div className='relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
							<IconSparkles className='h-6 w-6 text-primary animate-pulse' />
						</div>
					</div>

					{/* Content */}
					<div className='flex-1 min-w-0'>
						<div className='flex items-center justify-between mb-2'>
							<h3 className='font-semibold text-sm'>
								{t('backlogReports.generation.title')}
							</h3>
							<div className='flex items-center gap-2'>
								<span className='text-xs text-muted-foreground'>
									{formatElapsed(elapsedMs)}
								</span>
								<Button
									variant='ghost'
									size='icon'
									className='h-6 w-6'
									onClick={handleCancel}
									title={t('backlogReports.generation.cancel')}
								>
									<IconX className='h-3 w-3' />
								</Button>
							</div>
						</div>

						{/* Progress bar */}
						<Progress value={progress} className='h-2 mb-3' />

						{/* Steps indicator */}
						<div className='flex items-center justify-between gap-2'>
							{GENERATION_STEPS.map((step, index) => {
								const StepIcon = step.icon
								const isActive = currentStep === step.id
								const isPast = GENERATION_STEPS.findIndex(s => s.id === currentStep) > index

								return (
									<div
										key={step.id}
										className={cn(
											'flex items-center gap-1.5 text-xs transition-all duration-300',
											isActive && 'text-primary font-medium',
											isPast && 'text-primary/60',
											!isActive && !isPast && 'text-muted-foreground'
										)}
									>
										<StepIcon
											className={cn(
												'h-4 w-4 transition-all duration-300',
												isActive && 'animate-bounce'
											)}
										/>
										<span className='hidden sm:inline'>
											{t(`backlogReports.generation.steps.${step.id}`)}
										</span>
										{isActive && (
											<span className='inline-flex h-2 w-2 rounded-full bg-primary animate-pulse' />
										)}
									</div>
								)
							})}
						</div>
					</div>
				</div>

				{/* Fun fact / tip */}
				<div className='mt-3 pt-3 border-t border-primary/10'>
					<p className='text-xs text-muted-foreground italic'>
						{t('backlogReports.generation.tip')}
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
