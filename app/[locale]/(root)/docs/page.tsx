import { BackButton } from '@/components/back-button'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
	Activity,
	ArrowLeft,
	BarChart3,
	Calendar,
	CheckCircle,
	Clock,
	Download,
	FileText,
	Filter,
	GitBranch,
	Grid3x3,
	MessageSquare,
	PieChart,
	Table2,
	TrendingUp,
	Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function DocsPage() {
	const t = useTranslations('docs')

	return (
		<div className='min-h-screen bg-background'>
			<div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
				{/* Header */}
				<div className='mb-8'>
					<BackButton />
					<div className='space-y-3'>
						<h1 className='text-4xl font-bold tracking-tight'>{t('title')}</h1>
						<p className='text-lg text-muted-foreground max-w-3xl'>
							{t('subtitle')}
						</p>
					</div>
				</div>

				{/* Quick Navigation */}
				<Card className='mb-8'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Grid3x3 className='h-5 w-5' />
							{t('quickNav.title')}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
							<Button
								asChild
								variant='outline'
								size='sm'
								className='justify-start'
							>
								<Link href='#dashboard'>{t('quickNav.dashboard')}</Link>
							</Button>
							<Button
								asChild
								variant='outline'
								size='sm'
								className='justify-start'
							>
								<Link href='#support-overview'>
									{t('quickNav.supportOverview')}
								</Link>
							</Button>
							<Button
								asChild
								variant='outline'
								size='sm'
								className='justify-start'
							>
								<Link href='#detailed-stats'>
									{t('quickNav.detailedStats')}
								</Link>
							</Button>
							<Button
								asChild
								variant='outline'
								size='sm'
								className='justify-start'
							>
								<Link href='#filters'>{t('quickNav.filtersExport')}</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Main Content */}
				<div className='space-y-8'>
					{/* DASHBOARD SECTION */}
					<section id='dashboard'>
						<div className='mb-6'>
							<div className='flex items-center gap-3 mb-3'>
								<div className='p-2 rounded-lg bg-chart-1/10'>
									<BarChart3 className='h-6 w-6 text-chart-1' />
								</div>
								<h2 className='text-3xl font-bold'>{t('dashboard.title')}</h2>
							</div>
							<p className='text-muted-foreground'>
								{t('dashboard.description')}
							</p>
						</div>

						<Accordion type='multiple' className='space-y-4'>
							{/* KPI Cards */}
							<AccordionItem value='dashboard-kpis'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Activity className='h-5 w-5 text-chart-1' />
										{t('dashboard.kpis.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<div className='grid gap-4 sm:grid-cols-2'>
											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														{t('dashboard.kpis.totalRecords.title')}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong>{' '}
														{t('dashboard.kpis.totalRecords.whatItShows')}
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Trend:</strong>{' '}
														{t('dashboard.kpis.totalRecords.trend')}
													</p>
													<Badge variant='outline'>
														{t('dashboard.kpis.totalRecords.badge')}
													</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														{t('dashboard.kpis.averageQuality.title')}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong>{' '}
														{t('dashboard.kpis.averageQuality.whatItShows')}
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Formula:</strong>{' '}
														{t('dashboard.kpis.averageQuality.formula')}
													</p>
													<Badge variant='outline'>
														{t('dashboard.kpis.averageQuality.badge')}
													</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														{t('dashboard.kpis.bestCategory.title')}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong>{' '}
														{t('dashboard.kpis.bestCategory.whatItShows')}
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Display:</strong>{' '}
														{t('dashboard.kpis.bestCategory.display')}
													</p>
													<Badge variant='outline'>
														{t('dashboard.kpis.bestCategory.badge')}
													</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														{t('dashboard.kpis.recordsChanged.title')}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong>{' '}
														{t('dashboard.kpis.recordsChanged.whatItShows')}
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Meaning:</strong>{' '}
														{t('dashboard.kpis.recordsChanged.meaning')}
													</p>
													<Badge variant='outline'>
														{t('dashboard.kpis.recordsChanged.badge')}
													</Badge>
												</CardContent>
											</Card>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('dashboard.kpis.understandingQuality.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t('dashboard.kpis.understandingQuality.description')}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Quality Trends Chart */}
							<AccordionItem value='dashboard-trends'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<TrendingUp className='h-5 w-5 text-chart-1' />
										{t('dashboard.qualityTrends.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('dashboard.qualityTrends.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('dashboard.qualityTrends.features.title')}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t('dashboard.qualityTrends.features.timePeriod')}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'dashboard.qualityTrends.features.interactiveLegend'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'dashboard.qualityTrends.features.gradientAreas'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'dashboard.qualityTrends.features.hoverTooltips'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t('dashboard.qualityTrends.features.dataGrouping')}
													</span>
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('dashboard.qualityTrends.howToUse.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t('dashboard.qualityTrends.howToUse.description')}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Category Pie Chart */}
							<AccordionItem value='dashboard-category'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<PieChart className='h-5 w-5 text-chart-1' />
										{t('dashboard.categoryPieChart.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('dashboard.categoryPieChart.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('dashboard.categoryPieChart.whatItDisplays.title')}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														{t(
															'dashboard.categoryPieChart.whatItDisplays.centerLabel'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														{t(
															'dashboard.categoryPieChart.whatItDisplays.segments'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														{t(
															'dashboard.categoryPieChart.whatItDisplays.legend'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														{t(
															'dashboard.categoryPieChart.whatItDisplays.hoverTooltip'
														)}
													</span>
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('dashboard.categoryPieChart.insights.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t('dashboard.categoryPieChart.insights.description')}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Version Bar Chart */}
							<AccordionItem value='dashboard-version'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<GitBranch className='h-5 w-5 text-chart-1' />
										{t('dashboard.versionBarChart.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('dashboard.versionBarChart.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('dashboard.versionBarChart.features.title')}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														{t('dashboard.versionBarChart.features.bars')}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														{t(
															'dashboard.versionBarChart.features.qualityLabels'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														{t(
															'dashboard.versionBarChart.features.colorCoding'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														{t(
															'dashboard.versionBarChart.features.hoverTooltip'
														)}
													</span>
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('dashboard.versionBarChart.useCase.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t('dashboard.versionBarChart.useCase.description')}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Data Table */}
							<AccordionItem value='dashboard-table'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Table2 className='h-5 w-5 text-chart-1' />
										{t('dashboard.detailedStatsTable.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('dashboard.detailedStatsTable.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('dashboard.detailedStatsTable.tableStructure.title')}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													<strong>Level 1 (Bold):</strong>{' '}
													{t(
														'dashboard.detailedStatsTable.tableStructure.level1'
													)}
												</li>
												<li>
													<strong>Level 2 (Indented):</strong>{' '}
													{t(
														'dashboard.detailedStatsTable.tableStructure.level2'
													)}
												</li>
											</ul>

											<h4 className='font-semibold text-sm mt-4'>
												{t('dashboard.detailedStatsTable.columns.title')}
											</h4>
											<div className='grid gap-2 sm:grid-cols-2'>
												<div className='text-sm'>
													{t('dashboard.detailedStatsTable.columns.category')}
												</div>
												<div className='text-sm'>
													{t('dashboard.detailedStatsTable.columns.version')}
												</div>
												<div className='text-sm'>
													{t('dashboard.detailedStatsTable.columns.dates')}
												</div>
												<div className='text-sm'>
													{t(
														'dashboard.detailedStatsTable.columns.totalRecords'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'dashboard.detailedStatsTable.columns.qualifiedAgents'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'dashboard.detailedStatsTable.columns.recordsChanged'
													)}
												</div>
												<div className='text-sm'>
													{t('dashboard.detailedStatsTable.columns.quality')}
												</div>
											</div>

											<h4 className='font-semibold text-sm mt-4'>
												{t('dashboard.detailedStatsTable.features.title')}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'dashboard.detailedStatsTable.features.sortable'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'dashboard.detailedStatsTable.features.searchable'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'dashboard.detailedStatsTable.features.pagination'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'dashboard.detailedStatsTable.features.csvExport'
														)}
													</span>
												</li>
											</ul>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</section>

					<Separator />

					{/* SUPPORT OVERVIEW SECTION */}
					<section id='support-overview'>
						<div className='mb-6'>
							<div className='flex items-center gap-3 mb-3'>
								<div className='p-2 rounded-lg bg-chart-2/10'>
									<MessageSquare className='h-6 w-6 text-chart-2' />
								</div>
								<h2 className='text-3xl font-bold'>
									{t('supportOverview.title')}
								</h2>
							</div>
							<p className='text-muted-foreground'>
								{t('supportOverview.description')}
							</p>
						</div>

						<Accordion type='multiple' className='space-y-4'>
							{/* Support KPIs */}
							<AccordionItem value='support-kpis'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Activity className='h-5 w-5 text-chart-2' />
										{t('supportOverview.kpis.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<div className='grid gap-4 sm:grid-cols-2'>
											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														{t('supportOverview.kpis.aiDraftCoverage.title')}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong>{' '}
														{t(
															'supportOverview.kpis.aiDraftCoverage.whatItShows'
														)}
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Formula:</strong>{' '}
														{t('supportOverview.kpis.aiDraftCoverage.formula')}
													</p>
													<Badge variant='outline'>
														{t('supportOverview.kpis.aiDraftCoverage.badge')}
													</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														{t('supportOverview.kpis.replyRequired.title')}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong>{' '}
														{t(
															'supportOverview.kpis.replyRequired.whatItShows'
														)}
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Formula:</strong>{' '}
														{t('supportOverview.kpis.replyRequired.formula')}
													</p>
													<Badge variant='outline'>
														{t('supportOverview.kpis.replyRequired.badge')}
													</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														{t('supportOverview.kpis.resolutionRate.title')}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong>{' '}
														{t(
															'supportOverview.kpis.resolutionRate.whatItShows'
														)}
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Formula:</strong>{' '}
														{t('supportOverview.kpis.resolutionRate.formula')}
													</p>
													<Badge variant='outline'>
														{t('supportOverview.kpis.resolutionRate.badge')}
													</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														{t('supportOverview.kpis.avgRequirements.title')}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong>{' '}
														{t(
															'supportOverview.kpis.avgRequirements.whatItShows'
														)}
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Calculation:</strong>{' '}
														{t(
															'supportOverview.kpis.avgRequirements.calculation'
														)}
													</p>
													<Badge variant='outline'>
														{t('supportOverview.kpis.avgRequirements.badge')}
													</Badge>
												</CardContent>
											</Card>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Status Distribution */}
							<AccordionItem value='support-status'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<PieChart className='h-5 w-5 text-chart-2' />
										{t('supportOverview.statusDistribution.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('supportOverview.statusDistribution.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t(
													'supportOverview.statusDistribution.possibleStatuses.title'
												)}
											</h4>
											<div className='grid gap-2 text-sm'>
												<div className='flex items-center gap-2'>
													<Badge variant='secondary' className='text-xs'>
														AI Processing
													</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.statusDistribution.possibleStatuses.aiProcessing'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge variant='secondary' className='text-xs'>
														Data collected
													</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.statusDistribution.possibleStatuses.dataCollected'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge variant='secondary' className='text-xs'>
														Reply is ready
													</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.statusDistribution.possibleStatuses.replyIsReady'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge variant='secondary' className='text-xs'>
														ZOHO draft created
													</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.statusDistribution.possibleStatuses.zohoDraftCreated'
														)}
													</span>
												</div>
												<div className='text-xs text-muted-foreground'>
													{t(
														'supportOverview.statusDistribution.possibleStatuses.other'
													)}
												</div>
											</div>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('supportOverview.statusDistribution.usage.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t(
													'supportOverview.statusDistribution.usage.description'
												)}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Resolution Time */}
							<AccordionItem value='support-resolution'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Clock className='h-5 w-5 text-chart-2' />
										{t('supportOverview.resolutionTime.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('supportOverview.resolutionTime.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('supportOverview.resolutionTime.features.title')}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													<strong>Y-axis:</strong>{' '}
													{t('supportOverview.resolutionTime.features.yAxis')}
												</li>
												<li>
													<strong>X-axis:</strong>{' '}
													{t('supportOverview.resolutionTime.features.xAxis')}
												</li>
												<li>
													<strong>Bars:</strong>{' '}
													{t('supportOverview.resolutionTime.features.bars')}
												</li>
												<li>
													<strong>Tooltip:</strong>{' '}
													{t('supportOverview.resolutionTime.features.tooltip')}
												</li>
												<li>
													<strong>Filters:</strong>{' '}
													{t('supportOverview.resolutionTime.features.filters')}
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('supportOverview.resolutionTime.insights.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t(
													'supportOverview.resolutionTime.insights.description'
												)}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* AI Draft Flow */}
							<AccordionItem value='support-sankey'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<GitBranch className='h-5 w-5 text-chart-2' />
										{t('supportOverview.aiDraftFlow.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('supportOverview.aiDraftFlow.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('supportOverview.aiDraftFlow.flowStructure.title')}
											</h4>
											<div className='space-y-2 text-sm text-muted-foreground'>
												<div className='flex items-center gap-2'>
													<span className='font-medium'>1.</span>
													<span>
														{t(
															'supportOverview.aiDraftFlow.flowStructure.leftColumn'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<span className='font-medium'>2.</span>
													<span>
														{t(
															'supportOverview.aiDraftFlow.flowStructure.middleColumn'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<span className='font-medium'>3.</span>
													<span>
														{t(
															'supportOverview.aiDraftFlow.flowStructure.rightColumn'
														)}
													</span>
												</div>
											</div>

											<h4 className='font-semibold text-sm mt-4'>
												{t('supportOverview.aiDraftFlow.whatToLookFor.title')}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													{t(
														'supportOverview.aiDraftFlow.whatToLookFor.widerLines'
													)}
												</li>
												<li>
													{t(
														'supportOverview.aiDraftFlow.whatToLookFor.hoverFlows'
													)}
												</li>
												<li>
													{t(
														'supportOverview.aiDraftFlow.whatToLookFor.compareUsage'
													)}
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('supportOverview.aiDraftFlow.analysis.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t('supportOverview.aiDraftFlow.analysis.description')}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Requirements Heatmap */}
							<AccordionItem value='support-heatmap'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Grid3x3 className='h-5 w-5 text-chart-2' />
										{t('supportOverview.requirementsHeatmap.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('supportOverview.requirementsHeatmap.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t(
													'supportOverview.requirementsHeatmap.requirements.title'
												)}
											</h4>
											<div className='grid gap-2 text-sm'>
												<div className='flex items-center gap-2'>
													<Badge className='bg-blue-500 text-xs'>Reply</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.requirementsHeatmap.requirements.reply'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge className='bg-purple-500 text-xs'>ID</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.requirementsHeatmap.requirements.identification'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge className='bg-yellow-500 text-xs'>Edit</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.requirementsHeatmap.requirements.editing'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge className='bg-green-500 text-xs'>
														Subscription
													</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.requirementsHeatmap.requirements.subscription'
														)}
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge className='bg-orange-500 text-xs'>
														Tracking
													</Badge>
													<span className='text-muted-foreground'>
														{t(
															'supportOverview.requirementsHeatmap.requirements.tracking'
														)}
													</span>
												</div>
											</div>

											<h4 className='font-semibold text-sm mt-4'>
												{t(
													'supportOverview.requirementsHeatmap.howToRead.title'
												)}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													{t(
														'supportOverview.requirementsHeatmap.howToRead.cells'
													)}
												</li>
												<li>
													{t(
														'supportOverview.requirementsHeatmap.howToRead.darkerBlue'
													)}
												</li>
												<li>
													{t(
														'supportOverview.requirementsHeatmap.howToRead.lighterBlue'
													)}
												</li>
												<li>
													{t(
														'supportOverview.requirementsHeatmap.howToRead.diagonal'
													)}
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('supportOverview.requirementsHeatmap.useCase.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t(
													'supportOverview.requirementsHeatmap.useCase.description'
												)}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Support Threads Table */}
							<AccordionItem value='support-table'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Table2 className='h-5 w-5 text-chart-2' />
										{t('supportOverview.supportThreadsTable.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('supportOverview.supportThreadsTable.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('supportOverview.supportThreadsTable.columns.title')}
											</h4>
											<div className='grid gap-2 sm:grid-cols-2'>
												<div className='text-sm'>
													{t(
														'supportOverview.supportThreadsTable.columns.threadId'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'supportOverview.supportThreadsTable.columns.ticketId'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'supportOverview.supportThreadsTable.columns.type'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'supportOverview.supportThreadsTable.columns.status'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'supportOverview.supportThreadsTable.columns.requirements'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'supportOverview.supportThreadsTable.columns.aiDraft'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'supportOverview.supportThreadsTable.columns.quality'
													)}
												</div>
												<div className='text-sm'>
													{t(
														'supportOverview.supportThreadsTable.columns.createdAt'
													)}
												</div>
											</div>

											<h4 className='font-semibold text-sm mt-4'>
												{t(
													'supportOverview.supportThreadsTable.features.title'
												)}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'supportOverview.supportThreadsTable.features.search'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'supportOverview.supportThreadsTable.features.sortable'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'supportOverview.supportThreadsTable.features.pagination'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'supportOverview.supportThreadsTable.features.csvExport'
														)}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														{t(
															'supportOverview.supportThreadsTable.features.clickRow'
														)}
													</span>
												</li>
											</ul>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Thread Detail Page */}
							<AccordionItem value='support-detail'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<FileText className='h-5 w-5 text-chart-2' />
										{t('supportOverview.threadDetailPage.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('supportOverview.threadDetailPage.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t(
													'supportOverview.threadDetailPage.informationCards.title'
												)}
											</h4>
											<div className='grid gap-3 sm:grid-cols-2'>
												<Card>
													<CardHeader className='pb-3'>
														<CardTitle className='text-sm'>
															{t(
																'supportOverview.threadDetailPage.informationCards.threadInfo.title'
															)}
														</CardTitle>
													</CardHeader>
													<CardContent className='text-xs space-y-1'>
														{t(
															'supportOverview.threadDetailPage.informationCards.threadInfo.items'
														)
															.split(',')
															.map((item: string, i: number) => (
																<div key={i}>{item.trim()}</div>
															))}
													</CardContent>
												</Card>

												<Card>
													<CardHeader className='pb-3'>
														<CardTitle className='text-sm'>
															{t(
																'supportOverview.threadDetailPage.informationCards.qualityMetrics.title'
															)}
														</CardTitle>
													</CardHeader>
													<CardContent className='text-xs space-y-1'>
														{t(
															'supportOverview.threadDetailPage.informationCards.qualityMetrics.items'
														)
															.split(',')
															.map((item: string, i: number) => (
																<div key={i}>{item.trim()}</div>
															))}
													</CardContent>
												</Card>

												<Card>
													<CardHeader className='pb-3'>
														<CardTitle className='text-sm'>
															{t(
																'supportOverview.threadDetailPage.informationCards.requirements.title'
															)}
														</CardTitle>
													</CardHeader>
													<CardContent className='text-xs space-y-1'>
														{t(
															'supportOverview.threadDetailPage.informationCards.requirements.items'
														)
															.split(',')
															.map((item: string, i: number) => (
																<div key={i}>{item.trim()}</div>
															))}
													</CardContent>
												</Card>

												<Card>
													<CardHeader className='pb-3'>
														<CardTitle className='text-sm'>
															{t(
																'supportOverview.threadDetailPage.informationCards.aiDraftReply.title'
															)}
														</CardTitle>
													</CardHeader>
													<CardContent className='text-xs space-y-1'>
														{t(
															'supportOverview.threadDetailPage.informationCards.aiDraftReply.items'
														)
															.split(',')
															.map((item: string, i: number) => (
																<div key={i}>{item.trim()}</div>
															))}
													</CardContent>
												</Card>
											</div>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('supportOverview.threadDetailPage.navigation.title')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{t(
													'supportOverview.threadDetailPage.navigation.description'
												)}
											</p>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</section>

					<Separator />

					{/* DETAILED STATS SECTION */}
					<section id='detailed-stats'>
						<div className='mb-6'>
							<div className='flex items-center gap-3 mb-3'>
								<div className='p-2 rounded-lg bg-chart-3/10'>
									<Table2 className='h-6 w-6 text-chart-3' />
								</div>
								<h2 className='text-3xl font-bold'>
									{t('detailedStats.title')}
								</h2>
							</div>
							<p className='text-muted-foreground'>
								{t('detailedStats.description')}
							</p>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>
									{t('detailedStats.whatsOnThisPage.title')}
								</CardTitle>
								<CardDescription>
									{t('detailedStats.whatsOnThisPage.description')}
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								<p className='text-sm text-muted-foreground'>
									{t('detailedStats.whatsOnThisPage.content')}
								</p>

								<div className='space-y-2'>
									<h4 className='font-semibold text-sm'>
										{t('detailedStats.availableFeatures.title')}
									</h4>
									<ul className='space-y-2 text-sm text-muted-foreground'>
										<li className='flex items-center gap-2'>
											<Filter className='h-4 w-4' />
											{t('detailedStats.availableFeatures.filters')}
										</li>
										<li className='flex items-center gap-2'>
											<Table2 className='h-4 w-4' />
											{t('detailedStats.availableFeatures.hierarchicalTable')}
										</li>
										<li className='flex items-center gap-2'>
											<Download className='h-4 w-4' />
											{t('detailedStats.availableFeatures.csvExport')}
										</li>
									</ul>
								</div>

								<div className='rounded-lg border bg-muted/50 p-4'>
									<p className='text-sm font-medium mb-2'>
										{t('detailedStats.whenToUse.title')}
									</p>
									<p className='text-sm text-muted-foreground'>
										{t('detailedStats.whenToUse.description')}
									</p>
								</div>
							</CardContent>
						</Card>
					</section>

					<Separator />

					{/* FILTERS AND EXPORT SECTION */}
					<section id='filters'>
						<div className='mb-6'>
							<div className='flex items-center gap-3 mb-3'>
								<div className='p-2 rounded-lg bg-chart-4/10'>
									<Filter className='h-6 w-6 text-chart-4' />
								</div>
								<h2 className='text-3xl font-bold'>
									{t('filtersAndExport.title')}
								</h2>
							</div>
							<p className='text-muted-foreground'>
								{t('filtersAndExport.description')}
							</p>
						</div>

						<Accordion type='multiple' className='space-y-4'>
							{/* Dashboard Filters */}
							<AccordionItem value='filters-dashboard'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Filter className='h-5 w-5 text-chart-4' />
										{t('filtersAndExport.dashboardFilters.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<div className='grid gap-4 sm:grid-cols-2'>
											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<Calendar className='h-4 w-4' />
														{t(
															'filtersAndExport.dashboardFilters.dateRange.title'
														)}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Quick Options:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.dateRange.quickOptions'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Manual:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.dateRange.manual'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Default:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.dateRange.default'
														)}
													</p>
													<div className='rounded-lg bg-muted/50 p-3 text-xs'>
														{t(
															'filtersAndExport.dashboardFilters.dateRange.description'
														)}
													</div>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<GitBranch className='h-4 w-4' />
														{t(
															'filtersAndExport.dashboardFilters.versions.title'
														)}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Type:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.versions.type'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Options:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.versions.options'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Default:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.versions.default'
														)}
													</p>
													<div className='rounded-lg bg-muted/50 p-3 text-xs'>
														{t(
															'filtersAndExport.dashboardFilters.versions.description'
														)}
													</div>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<FileText className='h-4 w-4' />
														{t(
															'filtersAndExport.dashboardFilters.categories.title'
														)}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Type:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.categories.type'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Options:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.categories.options'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Features:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.categories.features'
														)}
													</p>
													<div className='rounded-lg bg-muted/50 p-3 text-xs'>
														{t(
															'filtersAndExport.dashboardFilters.categories.description'
														)}
													</div>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<Users className='h-4 w-4' />
														{t(
															'filtersAndExport.dashboardFilters.qualifiedAgents.title'
														)}
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Type:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.qualifiedAgents.type'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Options:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.qualifiedAgents.options'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Required:</strong>{' '}
														{t(
															'filtersAndExport.dashboardFilters.qualifiedAgents.required'
														)}
													</p>
													<div className='rounded-lg bg-muted/50 p-3 text-xs'>
														{t(
															'filtersAndExport.dashboardFilters.qualifiedAgents.description'
														)}
													</div>
												</CardContent>
											</Card>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t(
													'filtersAndExport.dashboardFilters.filterTips.title'
												)}
											</p>
											<ul className='space-y-1 text-sm text-muted-foreground'>
												<li>
													{t(
														'filtersAndExport.dashboardFilters.filterTips.realTime'
													)}
												</li>
												<li>
													{t(
														'filtersAndExport.dashboardFilters.filterTips.shareable'
													)}
												</li>
												<li>
													{t(
														'filtersAndExport.dashboardFilters.filterTips.persistent'
													)}
												</li>
												<li>
													{t(
														'filtersAndExport.dashboardFilters.filterTips.reset'
													)}
												</li>
												<li>
													{t(
														'filtersAndExport.dashboardFilters.filterTips.activeCount'
													)}
												</li>
											</ul>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Support Filters */}
							<AccordionItem value='filters-support'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Filter className='h-5 w-5 text-chart-4' />
										{t('filtersAndExport.supportFilters.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<Calendar className='h-4 w-4' />
														Date Range
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														{t('filtersAndExport.supportFilters.dateRange')}
													</p>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>Status</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Type:</strong>{' '}
														{t('filtersAndExport.supportFilters.status.type')}
													</p>
													<p className='text-muted-foreground'>
														<strong>Options:</strong>{' '}
														{t(
															'filtersAndExport.supportFilters.status.options'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Labels:</strong>{' '}
														{t('filtersAndExport.supportFilters.status.labels')}
													</p>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Request Type
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Options:</strong>{' '}
														{t(
															'filtersAndExport.supportFilters.requestType.options'
														)}
													</p>
													<p className='text-muted-foreground'>
														<strong>Features:</strong>{' '}
														{t(
															'filtersAndExport.supportFilters.requestType.features'
														)}
													</p>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Requirements
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<div className='space-y-1'>
														<Badge className='bg-blue-500 text-xs mr-1'>
															Reply
														</Badge>
														<Badge className='bg-purple-500 text-xs mr-1'>
															ID
														</Badge>
														<Badge className='bg-yellow-500 text-xs mr-1'>
															Edit
														</Badge>
														<Badge className='bg-green-500 text-xs mr-1'>
															Subscription
														</Badge>
														<Badge className='bg-orange-500 text-xs'>
															Tracking
														</Badge>
													</div>
													<p className='text-muted-foreground text-xs'>
														{t(
															'filtersAndExport.supportFilters.requirements.description'
														)}
													</p>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<GitBranch className='h-4 w-4' />
														Version
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														{t('filtersAndExport.supportFilters.version')}
													</p>
												</CardContent>
											</Card>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* CSV Export */}
							<AccordionItem value='filters-export'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Download className='h-5 w-5 text-chart-4' />
										{t('filtersAndExport.csvExport.title')}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											{t('filtersAndExport.csvExport.description')}
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('filtersAndExport.csvExport.howToExport.title')}
											</h4>
											<ol className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>1.</span>
													<span>
														{t('filtersAndExport.csvExport.howToExport.step1')}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>2.</span>
													<span>
														{t('filtersAndExport.csvExport.howToExport.step2')}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>3.</span>
													<span>
														{t('filtersAndExport.csvExport.howToExport.step3')}
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>4.</span>
													<span>
														{t('filtersAndExport.csvExport.howToExport.step4')}
													</span>
												</li>
											</ol>
										</div>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												{t('filtersAndExport.csvExport.exportLocations.title')}
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													<strong>Dashboard Table:</strong>{' '}
													{t(
														'filtersAndExport.csvExport.exportLocations.dashboardTable'
													)}
												</li>
												<li>
													<strong>Detailed Stats Page:</strong>{' '}
													{t(
														'filtersAndExport.csvExport.exportLocations.detailedStatsPage'
													)}
												</li>
												<li>
													<strong>Support Threads Table:</strong>{' '}
													{t(
														'filtersAndExport.csvExport.exportLocations.supportThreadsTable'
													)}
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												{t('filtersAndExport.csvExport.exportTips.title')}
											</p>
											<ul className='space-y-1 text-sm text-muted-foreground'>
												<li>
													{t(
														'filtersAndExport.csvExport.exportTips.respectsFilters'
													)}
												</li>
												<li>
													{t(
														'filtersAndExport.csvExport.exportTips.includesColumns'
													)}
												</li>
												<li>
													{t(
														'filtersAndExport.csvExport.exportTips.qualityAsNumbers'
													)}
												</li>
												<li>
													{t(
														'filtersAndExport.csvExport.exportTips.dateFormatting'
													)}
												</li>
												<li>
													{t(
														'filtersAndExport.csvExport.exportTips.filenameTimestamp'
													)}
												</li>
											</ul>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</section>

					<Separator />

					{/* UNDERSTANDING QUALITY SECTION */}
					<section id='quality'>
						<div className='mb-6'>
							<div className='flex items-center gap-3 mb-3'>
								<div className='p-2 rounded-lg bg-chart-5/10'>
									<CheckCircle className='h-6 w-6 text-chart-5' />
								</div>
								<h2 className='text-3xl font-bold'>
									{t('understandingQuality.title')}
								</h2>
							</div>
							<p className='text-muted-foreground'>
								{t('understandingQuality.description')}
							</p>
						</div>

						<div className='space-y-6'>
							<Card>
								<CardHeader>
									<CardTitle>
										{t('understandingQuality.qualityFormula.title')}
									</CardTitle>
									<CardDescription>
										{t('understandingQuality.qualityFormula.subtitle')}
									</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='rounded-lg border bg-muted p-4 font-mono text-sm'>
										{t('understandingQuality.qualityFormula.formula')}
									</div>

									<div className='space-y-3'>
										<h4 className='font-semibold text-sm'>
											{t(
												'understandingQuality.qualityFormula.stepByStep.title'
											)}
										</h4>
										<ol className='space-y-2 text-sm text-muted-foreground'>
											<li className='flex items-start gap-2'>
												<span className='font-medium'>1.</span>
												<span>
													{t(
														'understandingQuality.qualityFormula.stepByStep.step1'
													)}
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<span className='font-medium'>2.</span>
												<span>
													{t(
														'understandingQuality.qualityFormula.stepByStep.step2'
													)}
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<span className='font-medium'>3.</span>
												<span>
													{t(
														'understandingQuality.qualityFormula.stepByStep.step3'
													)}
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<span className='font-medium'>4.</span>
												<span>
													{t(
														'understandingQuality.qualityFormula.stepByStep.step4'
													)}
												</span>
											</li>
										</ol>
									</div>

									<div className='space-y-2'>
										<h4 className='font-semibold text-sm'>
											{t('understandingQuality.qualityFormula.example.title')}
										</h4>
										<div className='rounded-lg bg-muted/50 p-4 space-y-1 text-sm'>
											<div>
												{t(
													'understandingQuality.qualityFormula.example.totalRecords'
												)}
											</div>
											<div>
												{t(
													'understandingQuality.qualityFormula.example.recordsNotChanged'
												)}
											</div>
											<div>
												{t(
													'understandingQuality.qualityFormula.example.recordsChanged'
												)}
											</div>
											<div className='font-semibold pt-2'>
												{t(
													'understandingQuality.qualityFormula.example.result'
												)}
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>
										{t('understandingQuality.qualityColorCoding.title')}
									</CardTitle>
									<CardDescription>
										{t('understandingQuality.qualityColorCoding.subtitle')}
									</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='space-y-3'>
										<div className='flex items-center gap-3 p-3 rounded-lg bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800'>
											<div className='font-bold text-2xl text-green-700 dark:text-green-300'>
												{t(
													'understandingQuality.qualityColorCoding.good.range'
												)}
											</div>
											<div className='space-y-1'>
												<div className='font-semibold text-green-700 dark:text-green-300'>
													{t(
														'understandingQuality.qualityColorCoding.good.label'
													)}
												</div>
												<div className='text-sm text-green-600 dark:text-green-400'>
													{t(
														'understandingQuality.qualityColorCoding.good.description'
													)}
												</div>
											</div>
										</div>

										<div className='flex items-center gap-3 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800'>
											<div className='font-bold text-2xl text-yellow-700 dark:text-yellow-300'>
												{t(
													'understandingQuality.qualityColorCoding.medium.range'
												)}
											</div>
											<div className='space-y-1'>
												<div className='font-semibold text-yellow-700 dark:text-yellow-300'>
													{t(
														'understandingQuality.qualityColorCoding.medium.label'
													)}
												</div>
												<div className='text-sm text-yellow-600 dark:text-yellow-400'>
													{t(
														'understandingQuality.qualityColorCoding.medium.description'
													)}
												</div>
											</div>
										</div>

										<div className='flex items-center gap-3 p-3 rounded-lg bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800'>
											<div className='font-bold text-2xl text-red-700 dark:text-red-300'>
												{t(
													'understandingQuality.qualityColorCoding.poor.range'
												)}
											</div>
											<div className='space-y-1'>
												<div className='font-semibold text-red-700 dark:text-red-300'>
													{t(
														'understandingQuality.qualityColorCoding.poor.label'
													)}
												</div>
												<div className='text-sm text-red-600 dark:text-red-400'>
													{t(
														'understandingQuality.qualityColorCoding.poor.description'
													)}
												</div>
											</div>
										</div>
									</div>

									<div className='rounded-lg border bg-muted/50 p-4'>
										<p className='text-sm font-medium mb-2'>
											{t(
												'understandingQuality.qualityColorCoding.whereColorsAppear.title'
											)}
										</p>
										<ul className='space-y-1 text-sm text-muted-foreground'>
											<li>
												{t(
													'understandingQuality.qualityColorCoding.whereColorsAppear.tableCells'
												)}
											</li>
											<li>
												{t(
													'understandingQuality.qualityColorCoding.whereColorsAppear.barChartBars'
												)}
											</li>
											<li>
												{t(
													'understandingQuality.qualityColorCoding.whereColorsAppear.badgeBackgrounds'
												)}
											</li>
											<li>
												{t(
													'understandingQuality.qualityColorCoding.whereColorsAppear.threadDetailQuality'
												)}
											</li>
										</ul>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>
										{t('understandingQuality.qualifiedAgents.title')}
									</CardTitle>
									<CardDescription>
										{t('understandingQuality.qualifiedAgents.subtitle')}
									</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<p className='text-sm text-muted-foreground'>
										{t('understandingQuality.qualifiedAgents.description')}
									</p>

									<div className='space-y-2'>
										<h4 className='font-semibold text-sm'>
											{t(
												'understandingQuality.qualifiedAgents.whyThisMatters.title'
											)}
										</h4>
										<ul className='space-y-2 text-sm text-muted-foreground'>
											<li className='flex items-start gap-2'>
												<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
												<span>
													{t(
														'understandingQuality.qualifiedAgents.whyThisMatters.consistency'
													)}
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
												<span>
													{t(
														'understandingQuality.qualifiedAgents.whyThisMatters.reliability'
													)}
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
												<span>
													{t(
														'understandingQuality.qualifiedAgents.whyThisMatters.training'
													)}
												</span>
											</li>
										</ul>
									</div>

									<div className='rounded-lg border bg-muted/50 p-4'>
										<p className='text-sm font-medium mb-2'>
											{t(
												'understandingQuality.qualifiedAgents.configuration.title'
											)}
										</p>
										<p className='text-sm text-muted-foreground'>
											{t(
												'understandingQuality.qualifiedAgents.configuration.description'
											)}
										</p>
									</div>
								</CardContent>
							</Card>
						</div>
					</section>
				</div>

				{/* Footer Navigation */}
				<Card className='mt-12'>
					<CardHeader>
						<CardTitle>{t('readyToExplore.title')}</CardTitle>
						<CardDescription>{t('readyToExplore.subtitle')}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
							<Button asChild variant='default'>
								<Link href='/dashboard'>
									<BarChart3 className='mr-2 h-4 w-4' />
									{t('readyToExplore.goToDashboard')}
								</Link>
							</Button>
							<Button asChild variant='default'>
								<Link href='/support-overview'>
									<MessageSquare className='mr-2 h-4 w-4' />
									{t('readyToExplore.supportOverview')}
								</Link>
							</Button>
							<Button asChild variant='default'>
								<Link href='/detailed-stats'>
									<Table2 className='mr-2 h-4 w-4' />
									{t('readyToExplore.detailedStats')}
								</Link>
							</Button>
							<Button asChild variant='outline'>
								<Link href='/'>
									<ArrowLeft className='mr-2 h-4 w-4' />
									{t('readyToExplore.backToHome')}
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
