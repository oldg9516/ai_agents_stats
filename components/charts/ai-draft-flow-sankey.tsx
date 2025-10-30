'use client'

import { useState, useEffect } from 'react'
import { ResponsiveSankey } from '@nivo/sankey'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { SankeyData } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'

interface AIDraftFlowSankeyProps {
	data: SankeyData | null
}

/**
 * AI Draft Flow Sankey - Shows AI draft journey flow
 *
 * Features:
 * - Sankey diagram with flow visualization
 * - Shows volume through line width
 * - Created → Used/Edited/Rejected → Resolved/Pending
 */
export function AIDraftFlowSankey({ data }: AIDraftFlowSankeyProps) {
	const t = useTranslations()

	// Detect if mobile for responsive margins
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768)
		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	if (!data || data.links.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>{t('charts.aiDraftFlow.title')}</CardTitle>
					<CardDescription className='text-sm'>
						{t('charts.aiDraftFlow.description')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center justify-center h-[300px] text-sm text-muted-foreground'>
						{t('common.noDataAvailable')}
					</div>
				</CardContent>
			</Card>
		)
	}

	// Get theme colors from CSS variables
	const getChartColors = () => {
		if (typeof window === 'undefined') return []
		const style = getComputedStyle(document.documentElement)
		return [
			style.getPropertyValue('--chart-1').trim(),
			style.getPropertyValue('--chart-2').trim(),
			style.getPropertyValue('--chart-3').trim(),
			style.getPropertyValue('--chart-4').trim(),
			style.getPropertyValue('--chart-5').trim(),
		]
	}

	const chartColors = getChartColors()

	return (
		<Card className='min-w-0'>
			<CardHeader>
				<div className='flex items-center gap-1.5'>
					<CardTitle className='text-lg sm:text-xl'>{t('charts.aiDraftFlow.title')}</CardTitle>
					<InfoTooltip content={t('charts.aiDraftFlow.tooltip')} />
				</div>
				<CardDescription className='text-sm'>
					{t('charts.aiDraftFlow.description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<div className='h-[300px] w-full'>
					<ResponsiveSankey
						data={data}
						margin={
							isMobile
								? { top: 10, right: 10, bottom: 10, left: 10 }
								: { top: 20, right: 100, bottom: 20, left: 100 }
						}
						align='justify'
						colors={chartColors}
						nodeOpacity={1}
						nodeThickness={isMobile ? 12 : 18}
						nodeSpacing={isMobile ? 16 : 24}
						nodeBorderWidth={0}
						linkOpacity={0.5}
						linkHoverOthersOpacity={0.1}
						linkContract={3}
						enableLinkGradient={true}
						labelPosition={isMobile ? 'inside' : 'outside'}
						labelOrientation='horizontal'
						labelPadding={isMobile ? 4 : 8}
						labelTextColor={{
							from: 'color',
							modifiers: [['darker', 2]],
						}}
						theme={{
							text: {
								fill: 'hsl(var(--foreground))',
								fontSize: isMobile ? 9 : 11,
							},
							tooltip: {
								container: {
									background: 'hsl(var(--popover))',
									color: 'hsl(var(--popover-foreground))',
									fontSize: 12,
									border: '1px solid',
									borderColor: 'hsl(var(--border))',
									borderRadius: 'var(--radius)',
									padding: '8px 12px',
								},
							},
						}}
					/>
				</div>
			</CardContent>
		</Card>
	)
}
