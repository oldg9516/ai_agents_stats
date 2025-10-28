'use client'

import { ResponsiveSankey } from '@nivo/sankey'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SankeyData } from '@/lib/supabase/types'
import { useTheme } from 'next-themes'

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
	const { resolvedTheme } = useTheme()
	const isDark = resolvedTheme === 'dark'

	if (!data || data.links.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-lg sm:text-xl'>AI Draft Flow</CardTitle>
					<CardDescription className='text-sm'>
						Journey of AI-generated drafts
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center justify-center h-[300px] text-sm text-muted-foreground'>
						No flow data available
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className='min-w-0'>
			<CardHeader>
				<CardTitle className='text-lg sm:text-xl'>AI Draft Flow</CardTitle>
				<CardDescription className='text-sm'>
					Journey of AI-generated drafts
				</CardDescription>
			</CardHeader>
			<CardContent className='overflow-hidden'>
				<div className='h-[300px] w-full'>
					<ResponsiveSankey
						data={data}
						margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
						align='justify'
						colors={{ scheme: 'category10' }}
						nodeOpacity={1}
						nodeThickness={18}
						nodeSpacing={24}
						nodeBorderWidth={0}
						linkOpacity={0.5}
						linkHoverOthersOpacity={0.1}
						linkContract={3}
						enableLinkGradient={true}
						labelPosition='outside'
						labelOrientation='horizontal'
						labelPadding={16}
						labelTextColor={{
							from: 'color',
							modifiers: [isDark ? ['darker', 3] : ['brighter', 3]],
						}}
						theme={{
							text: {
								fill: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
								fontSize: 11,
							},
							tooltip: {
								container: {
									background: isDark ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)',
									color: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
									fontSize: 12,
									border: '1px solid',
									borderColor: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
									borderRadius: '6px',
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
