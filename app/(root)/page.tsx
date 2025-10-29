import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Glow } from '@/components/ui/glow'
import { Mockup } from '@/components/ui/mockup'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, BarChart3, MessageSquare, Table2, BookOpen } from 'lucide-react'

export default function Home() {
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
							AI Agent Statistics
							<span className='block bg-linear-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent'>
								Dashboard
							</span>
						</h1>
						<p className='mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl'>
							Comprehensive analytics platform for monitoring AI agent performance, quality
							metrics, and support operations. Track AI-generated content quality in
							real-time.
						</p>
					</div>

					{/* CTA Buttons */}
					<div className='flex flex-wrap items-center justify-center gap-4'>
						<Button asChild size='lg' className='gap-2'>
							<Link href='/dashboard'>
								View Dashboard
								<ArrowRight className='h-4 w-4' />
							</Link>
						</Button>
						<Button asChild variant='outline' size='lg'>
							<Link href='/support-overview'>Support Overview</Link>
						</Button>
						<Button asChild variant='outline' size='lg' className='gap-2'>
							<Link href='/docs'>
								<BookOpen className='h-4 w-4' />
								Documentation
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
								alt='AI Agent Statistics Dashboard Preview'
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
						Available Analytics
					</h2>
					<p className='mt-4 text-lg text-muted-foreground'>
						Explore comprehensive insights across multiple dimensions
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
								<CardTitle>Dashboard</CardTitle>
							</div>
							<CardDescription>Quality metrics and performance trends</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<ul className='space-y-1 text-sm text-muted-foreground'>
								<li>• Real-time quality percentage tracking</li>
								<li>• Category and version breakdowns</li>
								<li>• Weekly trend analysis</li>
								<li>• Interactive charts and KPIs</li>
								<li>• Qualified agent performance</li>
							</ul>
							<Button asChild variant='ghost' className='w-full mt-4'>
								<Link href='/dashboard'>
									Explore Dashboard
									<ArrowRight className='ml-2 h-4 w-4' />
								</Link>
							</Button>
						</CardContent>
					</Card>

					{/* Support Overview Card */}
					<Card className='relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]'>
						<div className='absolute top-0 right-0 h-24 w-24 bg-linear-to-br from-chart-2/20 to-transparent rounded-bl-[100px]' />
						<CardHeader>
							<div className='flex items-center gap-2'>
								<div className='p-2 rounded-lg bg-chart-2/10'>
									<MessageSquare className='h-5 w-5 text-chart-2' />
								</div>
								<CardTitle>Support Overview</CardTitle>
							</div>
							<CardDescription>Thread analytics and AI draft performance</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<ul className='space-y-1 text-sm text-muted-foreground'>
								<li>• AI draft coverage metrics</li>
								<li>• Status distribution analysis</li>
								<li>• Resolution time tracking</li>
								<li>• Requirements correlation</li>
								<li>• Thread-level detail views</li>
							</ul>
							<Button asChild variant='ghost' className='w-full mt-4'>
								<Link href='/support-overview'>
									View Support Analytics
									<ArrowRight className='ml-2 h-4 w-4' />
								</Link>
							</Button>
						</CardContent>
					</Card>

					{/* Detailed Stats Card */}
					<Card className='relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]'>
						<div className='absolute top-0 right-0 h-24 w-24 bg-linear-to-br from-chart-3/20 to-transparent rounded-bl-[100px]' />
						<CardHeader>
							<div className='flex items-center gap-2'>
								<div className='p-2 rounded-lg bg-chart-3/10'>
									<Table2 className='h-5 w-5 text-chart-3' />
								</div>
								<CardTitle>Detailed Stats</CardTitle>
							</div>
							<CardDescription>Complete data tables with export</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<ul className='space-y-1 text-sm text-muted-foreground'>
								<li>• Full hierarchical data views</li>
								<li>• Advanced sorting and filtering</li>
								<li>• CSV export functionality</li>
								<li>• Version-level breakdowns</li>
								<li>• Week-by-week analysis</li>
							</ul>
							<Button asChild variant='ghost' className='w-full mt-4'>
								<Link href='/detailed-stats'>
									Browse Detailed Stats
									<ArrowRight className='ml-2 h-4 w-4' />
								</Link>
							</Button>
						</CardContent>
					</Card>

					{/* Documentation Card */}
					<Card className='relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]'>
						<div className='absolute top-0 right-0 h-24 w-24 bg-linear-to-br from-chart-4/20 to-transparent rounded-bl-[100px]' />
						<CardHeader>
							<div className='flex items-center gap-2'>
								<div className='p-2 rounded-lg bg-chart-4/10'>
									<BookOpen className='h-5 w-5 text-chart-4' />
								</div>
								<CardTitle>Documentation</CardTitle>
							</div>
							<CardDescription>Platform structure and chart explanations</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<ul className='space-y-1 text-sm text-muted-foreground'>
								<li>• Dashboard layout and sections</li>
								<li>• Chart types and what they show</li>
								<li>• KPI metrics explained</li>
								<li>• Filter and navigation guide</li>
								<li>• Data export features</li>
							</ul>
							<Button asChild variant='ghost' className='w-full mt-4'>
								<Link href='/docs'>
									Read Documentation
									<ArrowRight className='ml-2 h-4 w-4' />
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* Key Features Highlight */}
			<section className='relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8'>
				<div className='rounded-2xl border bg-card p-8 sm:p-12 animate-appear animation-delay-500'>
					<div className='grid gap-8 md:grid-cols-2'>
						<div className='space-y-4'>
							<h3 className='text-2xl font-bold'>Real-Time Insights</h3>
							<p className='text-muted-foreground'>
								Monitor AI agent performance with live data updates. Track quality metrics
								across categories, versions, and time periods. Filter by qualified agents,
								request types, and prompt versions.
							</p>
						</div>
						<div className='space-y-4'>
							<h3 className='text-2xl font-bold'>Comprehensive Analytics</h3>
							<p className='text-muted-foreground'>
								From high-level KPIs to detailed thread-level analysis. Export data for
								reporting, visualize trends with interactive charts, and dive deep into
								individual thread performance.
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}
