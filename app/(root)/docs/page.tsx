/* eslint-disable react/no-unescaped-entities */
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	ArrowLeft,
	BookOpen,
	Database,
	Settings,
	TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

export default function DocsPage() {
	return (
		<div className='min-h-screen bg-background'>
			<div className='mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8'>
				{/* Header */}
				<div className='mb-12'>
					<Button asChild variant='ghost' className='mb-4 -ml-4'>
						<Link href='/'>
							<ArrowLeft className='mr-2 h-4 w-4' />
							Back to Home
						</Link>
					</Button>
					<div className='space-y-4'>
						<div className='flex items-center gap-3'>
							<div className='p-3 rounded-lg bg-chart-4/10'>
								<BookOpen className='h-8 w-8 text-chart-4' />
							</div>
							<h1 className='text-4xl font-bold tracking-tight'>
								Documentation
							</h1>
						</div>
						<p className='text-lg text-muted-foreground max-w-3xl'>
							Complete guide to the AI Agent Statistics Dashboard. Learn where
							each section is located, what metrics the charts display, and how
							to navigate through the platform effectively.
						</p>
					</div>
				</div>

				{/* Coming Soon Section */}
				<div className='mb-12 rounded-2xl border bg-card p-8 sm:p-12'>
					<div className='text-center space-y-4'>
						<div className='inline-flex p-4 rounded-full bg-muted'>
							<BookOpen className='h-12 w-12 text-muted-foreground' />
						</div>
						<h2 className='text-2xl font-bold'>Documentation Coming Soon</h2>
						<p className='text-muted-foreground max-w-2xl mx-auto'>
							We're working on comprehensive documentation covering all
							dashboard sections, chart explanations, and navigation guides.
							Check back soon for detailed information about the platform
							structure and features.
						</p>
					</div>
				</div>

				{/* Planned Documentation Sections */}
				<div className='space-y-6'>
					<h2 className='text-2xl font-bold'>Planned Documentation Sections</h2>
					<div className='grid gap-6 md:grid-cols-2'>
						{/* Dashboard Overview */}
						<Card>
							<CardHeader>
								<div className='flex items-center gap-2'>
									<div className='p-2 rounded-lg bg-chart-1/10'>
										<TrendingUp className='h-5 w-5 text-chart-1' />
									</div>
									<CardTitle>Dashboard Overview</CardTitle>
								</div>
								<CardDescription>Main analytics page structure</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className='space-y-2 text-sm text-muted-foreground'>
									<li>• KPI cards and their meanings</li>
									<li>• Quality trends chart explained</li>
									<li>• Category and version breakdowns</li>
									<li>• Filter options overview</li>
								</ul>
							</CardContent>
						</Card>

						{/* Support Overview Section */}
						<Card>
							<CardHeader>
								<div className='flex items-center gap-2'>
									<div className='p-2 rounded-lg bg-chart-2/10'>
										<BookOpen className='h-5 w-5 text-chart-2' />
									</div>
									<CardTitle>Support Overview</CardTitle>
								</div>
								<CardDescription>
									Thread analytics section guide
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className='space-y-2 text-sm text-muted-foreground'>
									<li>• Status distribution chart</li>
									<li>• AI draft flow diagram</li>
									<li>• Requirements correlation heatmap</li>
									<li>• Resolution time analysis</li>
								</ul>
							</CardContent>
						</Card>

						{/* Charts & Visualizations */}
						<Card>
							<CardHeader>
								<div className='flex items-center gap-2'>
									<div className='p-2 rounded-lg bg-chart-3/10'>
										<Database className='h-5 w-5 text-chart-3' />
									</div>
									<CardTitle>Charts & Visualizations</CardTitle>
								</div>
								<CardDescription>Understanding each chart type</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className='space-y-2 text-sm text-muted-foreground'>
									<li>• Pie charts for distribution</li>
									<li>• Bar charts for comparisons</li>
									<li>• Sankey diagrams for flows</li>
									<li>• Heatmaps for correlations</li>
								</ul>
							</CardContent>
						</Card>

						{/* Navigation & Features */}
						<Card>
							<CardHeader>
								<div className='flex items-center gap-2'>
									<div className='p-2 rounded-lg bg-chart-4/10'>
										<Settings className='h-5 w-5 text-chart-4' />
									</div>
									<CardTitle>Navigation & Features</CardTitle>
								</div>
								<CardDescription>Platform features and usage</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className='space-y-2 text-sm text-muted-foreground'>
									<li>• Sidebar navigation menu</li>
									<li>• Filter sheets and options</li>
									<li>• Data export functionality</li>
									<li>• Thread detail pages</li>
								</ul>
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Quick Links */}
				<div className='mt-12 rounded-xl border bg-muted/50 p-6'>
					<h3 className='font-semibold mb-4'>Quick Links</h3>
					<div className='flex flex-wrap gap-3'>
						<Button asChild variant='outline' size='sm'>
							<Link href='/dashboard'>Dashboard</Link>
						</Button>
						<Button asChild variant='outline' size='sm'>
							<Link href='/support-overview'>Support Overview</Link>
						</Button>
						<Button asChild variant='outline' size='sm'>
							<Link href='/detailed-stats'>Detailed Stats</Link>
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
