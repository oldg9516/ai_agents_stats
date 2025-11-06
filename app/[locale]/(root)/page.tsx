import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Glow } from '@/components/ui/glow'
import { Mockup } from '@/components/ui/mockup'
import { Link } from '@/i18n/routing'
import {
	ArrowRight,
	BarChart3,
	BookOpen,
	MessageSquare,
	Table2,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

/**
 * Enable Incremental Static Regeneration (ISR)
 * - Page is generated at build time
 * - Revalidates every 3600 seconds (1 hour)
 * - Serves cached version instantly
 * - Regenerates in background after revalidation time
 */
export const revalidate = 3600 // 1 hour in seconds

export default async function Home() {
	const t = await getTranslations('landing')
	const tCommon = await getTranslations('common')

	return (
		<div className='relative min-h-screen overflow-hidden bg-background'>
			{/* Background glow effects */}
			<Glow variant='above' className='opacity-50' />
			<Glow variant='center' className='opacity-30' />

			{/* Hero Section */}
			<section className='relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8'>
				<div className='text-center space-y-8 animate-appear'>
					{/* Hero heading */}
					<div className='space-y-4'>
						<h1 className='text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl'>
							{t('hero.title')}
							<span className='block bg-linear-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent pb-2'>
								{tCommon('dashboard')}
							</span>
						</h1>
						<p className='mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl'>
							{t('hero.subtitle')}
						</p>
					</div>

					{/* CTA Buttons */}
					<div className='flex flex-wrap items-center justify-center gap-4'>
						<Button asChild size='lg' className='gap-2'>
							<Link href='/dashboard'>
								{t('hero.ctaDashboard')}
								<ArrowRight className='h-4 w-4' />
							</Link>
						</Button>
						<Button asChild variant='outline' size='lg'>
							<Link href='/support-overview'>{t('hero.ctaSupport')}</Link>
						</Button>
						<Button asChild variant='outline' size='lg' className='gap-2'>
							<Link href='/docs'>
								<BookOpen className='h-4 w-4' />
								{t('hero.ctaDocs')}
							</Link>
						</Button>
					</div>
				</div>

				{/* Mockup Section */}
				<div className='mt-16 animate-appear animation-delay-200'>
					<Mockup className='mx-auto max-w-5xl'>
						<div className='relative aspect-video w-full overflow-hidden bg-muted'>
							<Image
								src='/dashboard-hero.png'
								alt={t('hero.title')}
								fill
								className='object-cover object-top'
								priority
							/>
						</div>
					</Mockup>
				</div>
			</section>

			{/* Features Section */}
			<section className='relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8'>
				<div className='text-center mb-12 animate-appear animation-delay-300'>
					<h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
						{t('features.title')}
					</h2>
					<p className='mt-4 text-lg text-muted-foreground'>
						{t('features.subtitle')}
					</p>
				</div>

				<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-appear animation-delay-400'>
					{/* Dashboard Card */}
					<Card className='relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]'>
						<div className='absolute top-0 right-0 h-24 w-24 bg-linear-to-br from-chart-1/20 to-transparent rounded-bl-[100px]' />
						<CardHeader>
							<div className='flex items-center gap-2'>
								<div className='p-2 rounded-lg bg-chart-1/10'>
									<BarChart3 className='h-5 w-5 text-chart-1' />
								</div>
								<CardTitle>{t('features.dashboard.title')}</CardTitle>
							</div>
							<CardDescription>
								{t('features.dashboard.description')}
							</CardDescription>
						</CardHeader>
					</Card>

					{/* Support Overview Card */}
					<Card className='relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]'>
						<div className='absolute top-0 right-0 h-24 w-24 bg-linear-to-br from-chart-2/20 to-transparent rounded-bl-[100px]' />
						<CardHeader>
							<div className='flex items-center gap-2'>
								<div className='p-2 rounded-lg bg-chart-2/10'>
									<MessageSquare className='h-5 w-5 text-chart-2' />
								</div>
								<CardTitle>{t('features.support.title')}</CardTitle>
							</div>
							<CardDescription>
								{t('features.support.description')}
							</CardDescription>
						</CardHeader>
					</Card>

					{/* Detailed Stats Card */}
					<Card className='relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]'>
						<div className='absolute top-0 right-0 h-24 w-24 bg-linear-to-br from-chart-3/20 to-transparent rounded-bl-[100px]' />
						<CardHeader>
							<div className='flex items-center gap-2'>
								<div className='p-2 rounded-lg bg-chart-3/10'>
									<Table2 className='h-5 w-5 text-chart-3' />
								</div>
								<CardTitle>{t('features.stats.title')}</CardTitle>
							</div>
							<CardDescription>
								{t('features.stats.description')}
							</CardDescription>
						</CardHeader>
					</Card>

					{/* Documentation Card */}
					<Card className='relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]'>
						<div className='absolute top-0 right-0 h-24 w-24 bg-linear-to-br from-chart-4/20 to-transparent rounded-bl-[100px]' />
						<CardHeader>
							<div className='flex items-center gap-2'>
								<div className='p-2 rounded-lg bg-chart-4/10'>
									<BookOpen className='h-5 w-5 text-chart-4' />
								</div>
								<CardTitle>{t('features.docs.title')}</CardTitle>
							</div>
							<CardDescription>
								{t('features.docs.description')}
							</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</section>

			{/* Key Features Section */}
			<section className='relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8'>
				<div className='text-center mb-12'>
					<h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
						{t('keyFeatures.title')}
					</h2>
					<p className='mt-4 text-lg text-muted-foreground'>
						{t('keyFeatures.subtitle')}
					</p>
				</div>

				<div className='grid gap-8 md:grid-cols-2'>
					<div className='space-y-4'>
						<h3 className='text-xl font-semibold'>
							{t('keyFeatures.realtime.title')}
						</h3>
						<p className='text-muted-foreground'>
							{t('keyFeatures.realtime.description')}
						</p>
					</div>
					<div className='space-y-4'>
						<h3 className='text-xl font-semibold'>
							{t('keyFeatures.filtering.title')}
						</h3>
						<p className='text-muted-foreground'>
							{t('keyFeatures.filtering.description')}
						</p>
					</div>
					<div className='space-y-4'>
						<h3 className='text-xl font-semibold'>
							{t('keyFeatures.export.title')}
						</h3>
						<p className='text-muted-foreground'>
							{t('keyFeatures.export.description')}
						</p>
					</div>
					<div className='space-y-4'>
						<h3 className='text-xl font-semibold'>
							{t('keyFeatures.visualization.title')}
						</h3>
						<p className='text-muted-foreground'>
							{t('keyFeatures.visualization.description')}
						</p>
					</div>
				</div>
			</section>
		</div>
	)
}
