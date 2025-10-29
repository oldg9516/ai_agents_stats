/* eslint-disable react/no-unescaped-entities */
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
import Link from 'next/link'
import { BackButton } from '@/components/back-button'

export default function DocsPage() {
	return (
		<div className='min-h-screen bg-background'>
			<div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
				{/* Header */}
				<div className='mb-8'>
					<BackButton />
					<div className='space-y-3'>
						<h1 className='text-4xl font-bold tracking-tight'>Documentation</h1>
						<p className='text-lg text-muted-foreground max-w-3xl'>
							Complete guide to using the AI Agent Statistics Dashboard. Learn
							how to navigate the platform, understand the metrics, and analyze
							AI performance data.
						</p>
					</div>
				</div>

				{/* Quick Navigation */}
				<Card className='mb-8'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Grid3x3 className='h-5 w-5' />
							Quick Navigation
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
								<a href='#dashboard'>Dashboard</a>
							</Button>
							<Button
								asChild
								variant='outline'
								size='sm'
								className='justify-start'
							>
								<a href='#support-overview'>Support Overview</a>
							</Button>
							<Button
								asChild
								variant='outline'
								size='sm'
								className='justify-start'
							>
								<a href='#detailed-stats'>Detailed Stats</a>
							</Button>
							<Button
								asChild
								variant='outline'
								size='sm'
								className='justify-start'
							>
								<a href='#filters'>Filters & Export</a>
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
								<h2 className='text-3xl font-bold'>Dashboard</h2>
							</div>
							<p className='text-muted-foreground'>
								Main analytics page showing AI agent quality metrics, trends,
								and performance breakdowns.
							</p>
						</div>

						<Accordion type='multiple' className='space-y-4'>
							{/* KPI Cards */}
							<AccordionItem value='dashboard-kpis'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Activity className='h-5 w-5 text-chart-1' />
										KPI Cards (4 Metrics)
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<div className='grid gap-4 sm:grid-cols-2'>
											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Total Records
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong> Total number of
														records reviewed by qualified agents during the
														selected period.
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Trend:</strong> Compares with the previous
														period of the same length.
													</p>
													<Badge variant='outline'>Count metric</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Average Quality
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong> Average quality
														percentage across all categories (weighted by
														volume).
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Formula:</strong> Records NOT changed by
														qualified agents / Total records × 100
													</p>
													<Badge variant='outline'>Percentage metric</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Best Category
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong> The category with
														the highest quality percentage.
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Display:</strong> Category name + quality
														percentage
													</p>
													<Badge variant='outline'>Text + percentage</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Records Changed
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong> Number of records
														edited or modified by qualified agents.
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Meaning:</strong> Lower is better (indicates
														AI output quality)
													</p>
													<Badge variant='outline'>Count metric</Badge>
												</CardContent>
											</Card>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>
												💡 Understanding Quality Calculation
											</p>
											<p className='text-sm text-muted-foreground'>
												Quality percentage measures how often qualified agents
												accept AI output without changes. A higher percentage
												means the AI is generating better content that requires
												less human editing.
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
										Quality Trends Over Time
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Multi-line area chart showing quality percentage trends
											for each category over time.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>Features:</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Time Period Selector:</strong> Quick buttons
														for 7 days, 30 days, 3 months, or All time
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Interactive Legend:</strong> Click
														checkboxes to show/hide specific categories
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Gradient Areas:</strong> Each category is
														color-coded with filled area under the line
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Hover Tooltips:</strong> See exact
														percentage and date when hovering over data points
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Data Grouping:</strong> Records are grouped
														by week starting date
													</span>
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>📊 How to Use</p>
											<p className='text-sm text-muted-foreground'>
												Use this chart to identify trends over time. Look for
												improving categories (upward trend) or categories that
												need attention (downward trend). Compare multiple
												categories to see which performs best consistently.
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
										Quality by Category (Pie Chart)
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Donut chart showing the distribution of records across
											different request categories with their quality metrics.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												What it displays:
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														<strong>Center Label:</strong> Total record count
														across all categories
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														<strong>Segments:</strong> Each slice represents a
														category, sized by record volume
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														<strong>Legend:</strong> Below chart, shows category
														names with color coding
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														<strong>Hover Tooltip:</strong> Shows number of
														records and quality percentage for that category
													</span>
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>💡 Insights</p>
											<p className='text-sm text-muted-foreground'>
												Use this to understand which categories have the most
												volume and how quality varies across categories. Larger
												slices indicate more records, while tooltip quality %
												shows performance.
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
										Version Comparison (Bar Chart)
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Vertical bar chart comparing quality percentages across
											different prompt versions (v1, v2, v3, etc.).
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>Features:</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														<strong>Bars:</strong> Sorted by version number (v1,
														v2, v3)
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														<strong>Quality Labels:</strong> Percentage shown on
														top of each bar
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														<strong>Color Coding:</strong> Green (≥61%), Yellow
														(31-60%), Red (≤30%)
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>•</span>
													<span>
														<strong>Hover Tooltip:</strong> Shows version,
														quality %, and record count
													</span>
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>🎯 Use Case</p>
											<p className='text-sm text-muted-foreground'>
												Compare prompt versions to see which generates the best
												quality output. Track improvements as you iterate on
												prompts. Higher bars indicate better performance.
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
										Detailed Stats Table
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Hierarchical table showing detailed breakdowns by version
											and week.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												Table Structure:
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													<strong>Level 1 (Bold):</strong> Version-level rows
													showing category + version aggregates
												</li>
												<li>
													<strong>Level 2 (Indented):</strong> Week-level rows
													showing weekly data within each version
												</li>
											</ul>

											<h4 className='font-semibold text-sm mt-4'>Columns:</h4>
											<div className='grid gap-2 sm:grid-cols-2'>
												<div className='text-sm'>
													<strong>Category:</strong> Request type
												</div>
												<div className='text-sm'>
													<strong>Version:</strong> Prompt version
												</div>
												<div className='text-sm'>
													<strong>Dates:</strong> Week range (for week rows)
												</div>
												<div className='text-sm'>
													<strong>Total Records:</strong> Count
												</div>
												<div className='text-sm'>
													<strong>Qualified Agents:</strong> Records by
													qualified agents
												</div>
												<div className='text-sm'>
													<strong>Records Changed:</strong> Edited count
												</div>
												<div className='text-sm'>
													<strong>Quality %:</strong> With color coding
												</div>
											</div>

											<h4 className='font-semibold text-sm mt-4'>Features:</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Sortable:</strong> Click column headers to
														sort
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Searchable:</strong> Search by category name
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Pagination:</strong> 20 rows per page
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>CSV Export:</strong> Download all visible
														data
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
								<h2 className='text-3xl font-bold'>Support Overview</h2>
							</div>
							<p className='text-muted-foreground'>
								Analytics for support thread operations, AI draft performance,
								and resolution tracking.
							</p>
						</div>

						<Accordion type='multiple' className='space-y-4'>
							{/* Support KPIs */}
							<AccordionItem value='support-kpis'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Activity className='h-5 w-5 text-chart-2' />
										KPI Cards (4 Metrics)
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<div className='grid gap-4 sm:grid-cols-2'>
											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														AI Draft Coverage
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong> Percentage of
														threads with AI-generated draft replies.
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Formula:</strong> Threads with
														ai_draft_reply / Total threads × 100
													</p>
													<Badge variant='outline'>Percentage metric</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Reply Required
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong> Percentage of
														threads requiring customer response.
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Formula:</strong> Threads with
														requires_reply=true / Total threads × 100
													</p>
													<Badge variant='outline'>Percentage metric</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Resolution Rate
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong> Percentage of
														threads marked as resolved.
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Formula:</strong> Threads with
														status=&apos;Reply is ready&apos; / Total threads ×
														100
													</p>
													<Badge variant='outline'>Percentage metric</Badge>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>
														Avg Requirements
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2'>
													<p className='text-sm text-muted-foreground'>
														<strong>What it shows:</strong> Average number of
														requirements per thread.
													</p>
													<p className='text-sm text-muted-foreground'>
														<strong>Calculation:</strong> Sum of all active
														requirement flags / Total threads
													</p>
													<Badge variant='outline'>Decimal metric</Badge>
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
										Status Distribution (Pie Chart)
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Donut chart showing breakdown of support threads by
											current status.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												Possible Statuses:
											</h4>
											<div className='grid gap-2 text-sm'>
												<div className='flex items-center gap-2'>
													<Badge variant='secondary' className='text-xs'>
														AI Processing
													</Badge>
													<span className='text-muted-foreground'>
														AI is processing the request
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge variant='secondary' className='text-xs'>
														Data collected
													</Badge>
													<span className='text-muted-foreground'>
														Required data has been collected
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge variant='secondary' className='text-xs'>
														Reply is ready
													</Badge>
													<span className='text-muted-foreground'>
														Response is ready (counts as resolved)
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge variant='secondary' className='text-xs'>
														ZOHO draft created
													</Badge>
													<span className='text-muted-foreground'>
														Draft created in ZOHO system
													</span>
												</div>
												<div className='text-xs text-muted-foreground'>
													...and 7 other statuses
												</div>
											</div>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>📊 Usage</p>
											<p className='text-sm text-muted-foreground'>
												Monitor thread distribution across workflow stages.
												Large segments indicate bottlenecks or stages where
												threads accumulate.
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
										Resolution Time (Bar Chart)
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Horizontal bar chart showing average hours to resolution
											grouped by week.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>Features:</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													<strong>Y-axis:</strong> Week (formatted as "MMM dd")
												</li>
												<li>
													<strong>X-axis:</strong> Average hours to resolution
												</li>
												<li>
													<strong>Bars:</strong> Show time values with
													&quot;XXh&quot; format
												</li>
												<li>
													<strong>Tooltip:</strong> Week, Avg Time (hours),
													Thread count
												</li>
												<li>
													<strong>Filters:</strong> Only shows threads with
													status &quot;Reply is ready&quot;
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>⏱️ Insights</p>
											<p className='text-sm text-muted-foreground'>
												Track how quickly support threads are being resolved
												over time. Look for trends - decreasing bars indicate
												improving efficiency.
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
										AI Draft Flow (Sankey Diagram)
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Flow diagram showing the journey of AI-generated drafts
											through the workflow.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>Flow Structure:</h4>
											<div className='space-y-2 text-sm text-muted-foreground'>
												<div className='flex items-center gap-2'>
													<span className='font-medium'>1.</span>
													<span>
														<strong>Left Column:</strong> Creation (threads with
														AI draft)
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<span className='font-medium'>2.</span>
													<span>
														<strong>Middle Column:</strong> Usage outcomes (Used
														without changes, Modified by agent, Rejected)
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<span className='font-medium'>3.</span>
													<span>
														<strong>Right Column:</strong> Final resolution
														states
													</span>
												</div>
											</div>

											<h4 className='font-semibold text-sm mt-4'>
												What to Look For:
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													• Wider lines = more threads following that path
												</li>
												<li>• Hover over flows to see exact numbers</li>
												<li>
													• Compare "Used without changes" vs "Modified" to
													gauge AI quality
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>🔍 Analysis</p>
											<p className='text-sm text-muted-foreground'>
												Ideal scenario: Most threads flow through "Used without
												changes" to resolution. Large flows to "Modified" or
												"Rejected" indicate areas for AI improvement.
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
										Requirements Correlation (Heatmap)
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Heatmap showing how often requirements appear together in
											threads.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>Requirements:</h4>
											<div className='grid gap-2 text-sm'>
												<div className='flex items-center gap-2'>
													<Badge className='bg-blue-500 text-xs'>Reply</Badge>
													<span className='text-muted-foreground'>
														Customer response needed
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge className='bg-purple-500 text-xs'>ID</Badge>
													<span className='text-muted-foreground'>
														Identity verification needed
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge className='bg-yellow-500 text-xs'>Edit</Badge>
													<span className='text-muted-foreground'>
														AI draft needs editing
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge className='bg-green-500 text-xs'>
														Subscription
													</Badge>
													<span className='text-muted-foreground'>
														Subscription info needed
													</span>
												</div>
												<div className='flex items-center gap-2'>
													<Badge className='bg-orange-500 text-xs'>
														Tracking
													</Badge>
													<span className='text-muted-foreground'>
														Tracking info needed
													</span>
												</div>
											</div>

											<h4 className='font-semibold text-sm mt-4'>
												How to Read:
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													• Each cell shows correlation percentage (0-100%)
												</li>
												<li>
													• Darker blue = higher correlation (appear together
													often)
												</li>
												<li>
													• Lighter blue = lower correlation (rarely appear
													together)
												</li>
												<li>• Diagonal = 100% (requirement with itself)</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>💡 Use Case</p>
											<p className='text-sm text-muted-foreground'>
												Identify patterns in requirement combinations. High
												correlations suggest these requirements commonly occur
												together, which can help predict workflow needs.
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
										Support Threads Table
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Complete table of all support threads with searchable and
											sortable columns.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>Columns:</h4>
											<div className='grid gap-2 sm:grid-cols-2'>
												<div className='text-sm'>
													<strong>Thread ID:</strong> Unique identifier
													(monospace)
												</div>
												<div className='text-sm'>
													<strong>Ticket ID:</strong> Associated ticket
													(monospace)
												</div>
												<div className='text-sm'>
													<strong>Type:</strong> Request type with readable
													label
												</div>
												<div className='text-sm'>
													<strong>Status:</strong> Current status with readable
													label
												</div>
												<div className='text-sm'>
													<strong>Requirements:</strong> Colored badges for
													active requirements
												</div>
												<div className='text-sm'>
													<strong>AI Draft:</strong> ✓ or ✗ icon
												</div>
												<div className='text-sm'>
													<strong>Quality:</strong> Color-coded percentage
												</div>
												<div className='text-sm'>
													<strong>Created At:</strong> Date with timestamp
												</div>
											</div>

											<h4 className='font-semibold text-sm mt-4'>Features:</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Search:</strong> By Thread ID or Ticket ID
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Sortable:</strong> Click any column header
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Pagination:</strong> 20 rows per page
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>CSV Export:</strong> Download all data
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
													<span>
														<strong>Click Row:</strong> Navigate to thread
														detail page
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
										Thread Detail Page
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Detailed view of a single support thread with all metadata
											and AI draft content.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												Information Cards:
											</h4>
											<div className='grid gap-3 sm:grid-cols-2'>
												<Card>
													<CardHeader className='pb-3'>
														<CardTitle className='text-sm'>
															Thread Information
														</CardTitle>
													</CardHeader>
													<CardContent className='text-xs space-y-1'>
														<div>• Thread ID</div>
														<div>• Ticket ID</div>
														<div>• Status (readable)</div>
														<div>• Request Type (readable)</div>
														<div>• Prompt Version</div>
														<div>• Created At (formatted)</div>
													</CardContent>
												</Card>

												<Card>
													<CardHeader className='pb-3'>
														<CardTitle className='text-sm'>
															Quality Metrics
														</CardTitle>
													</CardHeader>
													<CardContent className='text-xs space-y-1'>
														<div>• Has AI Draft (✓ or ✗)</div>
														<div>• Quality Score (color-coded %)</div>
														<div>• Reviewed By (agent email)</div>
													</CardContent>
												</Card>

												<Card>
													<CardHeader className='pb-3'>
														<CardTitle className='text-sm'>
															Requirements
														</CardTitle>
													</CardHeader>
													<CardContent className='text-xs space-y-1'>
														<div>• List of active requirements</div>
														<div>• Colored badges for each</div>
														<div>• Green checkmark icons</div>
													</CardContent>
												</Card>

												<Card>
													<CardHeader className='pb-3'>
														<CardTitle className='text-sm'>
															AI Draft Reply
														</CardTitle>
													</CardHeader>
													<CardContent className='text-xs space-y-1'>
														<div>• Full AI-generated content</div>
														<div>• Scrollable area (max 400px)</div>
														<div>• Monospace formatting</div>
													</CardContent>
												</Card>
											</div>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>🔍 Navigation</p>
											<p className='text-sm text-muted-foreground'>
												Click any row in the Support Threads Table to view full
												details. Use browser back button to return to the table.
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
								<h2 className='text-3xl font-bold'>Detailed Stats</h2>
							</div>
							<p className='text-muted-foreground'>
								Full-page table view with all dashboard data in a comprehensive,
								exportable format.
							</p>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>What's on This Page</CardTitle>
								<CardDescription>
									This page provides a dedicated full-width view of the detailed
									stats table
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								<p className='text-sm text-muted-foreground'>
									The Detailed Stats page shows the same hierarchical table from
									the dashboard, but with more screen space for easier data
									exploration.
								</p>

								<div className='space-y-2'>
									<h4 className='font-semibold text-sm'>Available Features:</h4>
									<ul className='space-y-2 text-sm text-muted-foreground'>
										<li className='flex items-center gap-2'>
											<Filter className='h-4 w-4' />
											All filters from dashboard (Date, Version, Category,
											Agents)
										</li>
										<li className='flex items-center gap-2'>
											<Table2 className='h-4 w-4' />
											Hierarchical table with version and week-level rows
										</li>
										<li className='flex items-center gap-2'>
											<Download className='h-4 w-4' />
											CSV export functionality
										</li>
									</ul>
								</div>

								<div className='rounded-lg border bg-muted/50 p-4'>
									<p className='text-sm font-medium mb-2'>💡 When to Use</p>
									<p className='text-sm text-muted-foreground'>
										Use this page when you need to focus on detailed data
										analysis without the charts. Perfect for exporting data,
										sorting through large datasets, or when you need the extra
										screen space for the table.
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
								<h2 className='text-3xl font-bold'>Filters & Export</h2>
							</div>
							<p className='text-muted-foreground'>
								How to use filters to refine data and export results for
								reporting.
							</p>
						</div>

						<Accordion type='multiple' className='space-y-4'>
							{/* Dashboard Filters */}
							<AccordionItem value='filters-dashboard'>
								<AccordionTrigger className='text-lg font-semibold hover:no-underline'>
									<div className='flex items-center gap-2'>
										<Filter className='h-5 w-5 text-chart-4' />
										Dashboard Filters
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<div className='grid gap-4 sm:grid-cols-2'>
											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<Calendar className='h-4 w-4' />
														Date Range
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Quick Options:</strong> 7d, 30d, 3m, All
													</p>
													<p className='text-muted-foreground'>
														<strong>Manual:</strong> Select From and To dates
													</p>
													<p className='text-muted-foreground'>
														<strong>Default:</strong> Last 30 days
													</p>
													<div className='rounded-lg bg-muted/50 p-3 text-xs'>
														Filters all data to only show records created within
														the selected date range. Trends compare with
														previous period of same length.
													</div>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<GitBranch className='h-4 w-4' />
														Versions
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Type:</strong> Multi-select dropdown
													</p>
													<p className='text-muted-foreground'>
														<strong>Options:</strong> v1, v2, v3, etc.
													</p>
													<p className='text-muted-foreground'>
														<strong>Default:</strong> All selected
													</p>
													<div className='rounded-lg bg-muted/50 p-3 text-xs'>
														Filter by prompt version to compare performance
														across iterations. Select multiple to compare.
													</div>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<FileText className='h-4 w-4' />
														Categories
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Type:</strong> Multi-select dropdown
													</p>
													<p className='text-muted-foreground'>
														<strong>Options:</strong> Request subtypes from
														database
													</p>
													<p className='text-muted-foreground'>
														<strong>Features:</strong> Searchable, Select
														All/Deselect All
													</p>
													<div className='rounded-lg bg-muted/50 p-3 text-xs'>
														Filter by request category to focus on specific
														types of content. Useful for analyzing performance
														by content type.
													</div>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base flex items-center gap-2'>
														<Users className='h-4 w-4' />
														Qualified Agents
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Type:</strong> Multi-select dropdown
													</p>
													<p className='text-muted-foreground'>
														<strong>Options:</strong> Fixed list of qualified
														agent emails
													</p>
													<p className='text-muted-foreground'>
														<strong>Required:</strong> At least 1 agent must be
														selected
													</p>
													<div className='rounded-lg bg-muted/50 p-3 text-xs'>
														Filter by specific qualified agents. Only records
														reviewed by these agents count toward quality
														metrics.
													</div>
												</CardContent>
											</Card>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>🎯 Filter Tips</p>
											<ul className='space-y-1 text-sm text-muted-foreground'>
												<li>
													• All filters update data in real-time across all
													charts and tables
												</li>
												<li>• Filters are saved to URL (shareable links)</li>
												<li>• Filters persist in browser (localStorage)</li>
												<li>
													• Use "Reset Filters" button to return to defaults
												</li>
												<li>
													• Active filter count shown on filter button (e.g.,
													"Filters (3)")
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
										Support Overview Filters
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
														Same as dashboard date filter
													</p>
												</CardContent>
											</Card>

											<Card>
												<CardHeader className='pb-3'>
													<CardTitle className='text-base'>Status</CardTitle>
												</CardHeader>
												<CardContent className='space-y-2 text-sm'>
													<p className='text-muted-foreground'>
														<strong>Type:</strong> Multi-select
													</p>
													<p className='text-muted-foreground'>
														<strong>Options:</strong> All 11 support statuses
													</p>
													<p className='text-muted-foreground'>
														<strong>Labels:</strong> Human-readable status names
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
														<strong>Options:</strong> General Inquiry,
														Subscription Support, Tracking, etc.
													</p>
													<p className='text-muted-foreground'>
														<strong>Features:</strong> Multi-select, searchable
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
														Multi-select with colored badges
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
														Same as dashboard version filter
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
										CSV Export
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className='space-y-4 pt-4'>
										<p className='text-sm text-muted-foreground'>
											Export filtered data to CSV format for reporting, analysis
											in Excel, or archival.
										</p>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>How to Export:</h4>
											<ol className='space-y-2 text-sm text-muted-foreground'>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>1.</span>
													<span>
														Apply desired filters (date range, categories,
														versions, etc.)
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>2.</span>
													<span>
														Click the "Download CSV" button above the table (top
														right)
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>3.</span>
													<span>
														File downloads automatically with timestamp in
														filename
													</span>
												</li>
												<li className='flex items-start gap-2'>
													<span className='font-medium'>4.</span>
													<span>
														Open in Excel, Google Sheets, or any CSV reader
													</span>
												</li>
											</ol>
										</div>

										<div className='space-y-3'>
											<h4 className='font-semibold text-sm'>
												Export Locations:
											</h4>
											<ul className='space-y-2 text-sm text-muted-foreground'>
												<li>
													<strong>Dashboard Table:</strong> Exports detailed
													stats with all columns
												</li>
												<li>
													<strong>Detailed Stats Page:</strong> Same export as
													dashboard
												</li>
												<li>
													<strong>Support Threads Table:</strong> Exports all
													thread data with requirements
												</li>
											</ul>
										</div>

										<div className='rounded-lg border bg-muted/50 p-4'>
											<p className='text-sm font-medium mb-2'>📊 Export Tips</p>
											<ul className='space-y-1 text-sm text-muted-foreground'>
												<li>• Exports respect all active filters</li>
												<li>• Includes all columns visible in the table</li>
												<li>
													• Quality percentages exported as numbers (61.5, not
													"61.5%")
												</li>
												<li>• Dates formatted as ISO 8601 for easy parsing</li>
												<li>
													• Filename includes timestamp for version tracking
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
									Understanding Quality Metrics
								</h2>
							</div>
							<p className='text-muted-foreground'>
								Deep dive into how quality is calculated and what the metrics
								mean.
							</p>
						</div>

						<div className='space-y-6'>
							<Card>
								<CardHeader>
									<CardTitle>Quality Percentage Formula</CardTitle>
									<CardDescription>
										The core metric measuring AI agent performance
									</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='rounded-lg border bg-muted p-4 font-mono text-sm'>
										Quality % = (Records NOT changed by qualified agents / Total
										records by qualified agents) × 100
									</div>

									<div className='space-y-3'>
										<h4 className='font-semibold text-sm'>
											Step-by-Step Calculation:
										</h4>
										<ol className='space-y-2 text-sm text-muted-foreground'>
											<li className='flex items-start gap-2'>
												<span className='font-medium'>1.</span>
												<span>
													Filter records to only those reviewed by qualified
													agents (defined in constants/qualified-agents.ts)
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<span className='font-medium'>2.</span>
												<span>
													Count records where changed = false (AI output used
													without modifications)
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<span className='font-medium'>3.</span>
												<span>
													Count total records reviewed by qualified agents in
													the period
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<span className='font-medium'>4.</span>
												<span>
													Divide unchanged by total and multiply by 100
												</span>
											</li>
										</ol>
									</div>

									<div className='space-y-2'>
										<h4 className='font-semibold text-sm'>Example:</h4>
										<div className='rounded-lg bg-muted/50 p-4 space-y-1 text-sm'>
											<div>Total records by qualified agents: 100</div>
											<div>Records NOT changed: 75</div>
											<div>Records changed: 25</div>
											<div className='font-semibold pt-2'>
												Quality = (75 / 100) × 100 = 75%
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Quality Color Coding</CardTitle>
									<CardDescription>
										Visual indicators used throughout the dashboard
									</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='space-y-3'>
										<div className='flex items-center gap-3 p-3 rounded-lg bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800'>
											<div className='font-bold text-2xl text-green-700 dark:text-green-300'>
												61-100%
											</div>
											<div className='space-y-1'>
												<div className='font-semibold text-green-700 dark:text-green-300'>
													Good Quality
												</div>
												<div className='text-sm text-green-600 dark:text-green-400'>
													Most AI outputs used without changes. Excellent
													performance.
												</div>
											</div>
										</div>

										<div className='flex items-center gap-3 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800'>
											<div className='font-bold text-2xl text-yellow-700 dark:text-yellow-300'>
												31-60%
											</div>
											<div className='space-y-1'>
												<div className='font-semibold text-yellow-700 dark:text-yellow-300'>
													Medium Quality
												</div>
												<div className='text-sm text-yellow-600 dark:text-yellow-400'>
													Some outputs need editing. Room for improvement.
												</div>
											</div>
										</div>

										<div className='flex items-center gap-3 p-3 rounded-lg bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800'>
											<div className='font-bold text-2xl text-red-700 dark:text-red-300'>
												0-30%
											</div>
											<div className='space-y-1'>
												<div className='font-semibold text-red-700 dark:text-red-300'>
													Poor Quality
												</div>
												<div className='text-sm text-red-600 dark:text-red-400'>
													Most outputs require editing. Needs attention.
												</div>
											</div>
										</div>
									</div>

									<div className='rounded-lg border bg-muted/50 p-4'>
										<p className='text-sm font-medium mb-2'>
											🎨 Where Colors Appear
										</p>
										<ul className='space-y-1 text-sm text-muted-foreground'>
											<li>• Table cells (Quality % column)</li>
											<li>• Bar chart bars (Version Comparison)</li>
											<li>• Badge backgrounds (various locations)</li>
											<li>• Thread detail quality scores</li>
										</ul>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Qualified Agents</CardTitle>
									<CardDescription>
										Why only certain agents count toward metrics
									</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<p className='text-sm text-muted-foreground'>
										Only records reviewed by "qualified agents" are included in
										quality calculations. This ensures consistency and
										reliability of metrics.
									</p>

									<div className='space-y-2'>
										<h4 className='font-semibold text-sm'>Why This Matters:</h4>
										<ul className='space-y-2 text-sm text-muted-foreground'>
											<li className='flex items-start gap-2'>
												<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
												<span>
													<strong>Consistency:</strong> Qualified agents have
													established review standards
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
												<span>
													<strong>Reliability:</strong> Metrics are comparable
													over time
												</span>
											</li>
											<li className='flex items-start gap-2'>
												<CheckCircle className='h-4 w-4 text-green-600 mt-0.5 shrink-0' />
												<span>
													<strong>Training:</strong> Qualified agents understand
													the evaluation criteria
												</span>
											</li>
										</ul>
									</div>

									<div className='rounded-lg border bg-muted/50 p-4'>
										<p className='text-sm font-medium mb-2'>ℹ️ Configuration</p>
										<p className='text-sm text-muted-foreground'>
											The list of qualified agent emails is configured in
											constants/qualified-agents.ts. This filter is always
											applied and cannot be disabled.
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
						<CardTitle>Ready to Explore?</CardTitle>
						<CardDescription>
							Jump directly to any section of the dashboard
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
							<Button asChild variant='default'>
								<Link href='/dashboard'>
									<BarChart3 className='mr-2 h-4 w-4' />
									Go to Dashboard
								</Link>
							</Button>
							<Button asChild variant='default'>
								<Link href='/support-overview'>
									<MessageSquare className='mr-2 h-4 w-4' />
									Support Overview
								</Link>
							</Button>
							<Button asChild variant='default'>
								<Link href='/detailed-stats'>
									<Table2 className='mr-2 h-4 w-4' />
									Detailed Stats
								</Link>
							</Button>
							<Button asChild variant='outline'>
								<Link href='/'>
									<ArrowLeft className='mr-2 h-4 w-4' />
									Back to Home
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
