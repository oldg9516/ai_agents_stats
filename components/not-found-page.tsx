'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Glow } from '@/components/ui/glow'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Home, ArrowLeft, FileQuestion } from 'lucide-react'

interface NotFoundPageProps {
	/**
	 * Return path for the "Go Back" button
	 * If not provided, button will not be shown
	 */
	returnPath?: string
	/**
	 * Custom title override
	 */
	title?: string
	/**
	 * Custom description override
	 */
	description?: string
}

/**
 * Styled 404 Not Found Page Component
 *
 * Features:
 * - Background glow effects matching landing page
 * - Gradient 404 text
 * - Localized content (en/ru)
 * - Responsive design
 * - Navigation buttons
 * - Animations
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NotFoundPage />
 *
 * // With custom return path
 * <NotFoundPage returnPath="/dashboard" />
 *
 * // With custom content
 * <NotFoundPage
 *   title="Thread Not Found"
 *   description="The thread you're looking for doesn't exist"
 *   returnPath="/support-overview"
 * />
 * ```
 */
export function NotFoundPage({ returnPath, title, description }: NotFoundPageProps) {
	const t = useTranslations('notFound')

	return (
		<div className='relative min-h-screen flex items-center justify-center overflow-hidden bg-background'>
			{/* Background glow effects */}
			<Glow variant='above' className='opacity-40' />
			<Glow variant='center' className='opacity-20' />

			<div className='relative z-10 w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8'>
				<div className='text-center space-y-8 animate-appear'>
					{/* 404 Number with gradient */}
					<div className='space-y-4'>
						<h1 className='text-8xl sm:text-9xl font-bold tracking-tight bg-linear-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent'>
							404
						</h1>
					</div>

					{/* Card with error details */}
					<Card className='relative overflow-hidden transition-all animate-appear animation-delay-200'>
						<div className='absolute top-0 right-0 h-32 w-32 bg-linear-to-br from-chart-1/20 to-transparent rounded-bl-[100px]' />
						<CardHeader className='text-center'>
							<div className='flex justify-center mb-4'>
								<div className='p-4 rounded-full bg-muted'>
									<FileQuestion className='h-12 w-12 text-muted-foreground' />
								</div>
							</div>
							<CardTitle className='text-2xl sm:text-3xl'>
								{title || t('title')}
							</CardTitle>
							<CardDescription className='text-base sm:text-lg'>
								{description || t('description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<p className='text-sm text-muted-foreground text-center'>
								{t('hint')}
							</p>

							{/* Action buttons */}
							<div className='flex flex-col sm:flex-row gap-3 justify-center pt-4'>
								{returnPath && (
									<Button asChild variant='outline' size='lg' className='gap-2'>
										<Link href={returnPath}>
											<ArrowLeft className='h-4 w-4' />
											{t('goBack')}
										</Link>
									</Button>
								)}
								<Button asChild size='lg' className='gap-2'>
									<Link href='/'>
										<Home className='h-4 w-4' />
										{t('goHome')}
									</Link>
								</Button>
								<Button asChild variant='outline' size='lg'>
									<Link href='/dashboard'>{t('goDashboard')}</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Additional help text */}
					<p className='text-sm text-muted-foreground animate-appear animation-delay-400'>
						{t('needHelp')}{' '}
						<Link
							href='/docs'
							className='text-primary hover:underline font-medium'
						>
							{t('checkDocs')}
						</Link>
					</p>
				</div>
			</div>
		</div>
	)
}
