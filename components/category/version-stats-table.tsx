'use client'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CategoryVersionStats } from '@/lib/supabase/types'
import { useTranslations } from 'next-intl'
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react'

interface VersionStatsTableProps {
	data: CategoryVersionStats[]
}

/**
 * Version Stats Table Component
 *
 * Displays quality breakdown by prompt version for a category
 * Features:
 * - Color-coded quality badges (green/yellow/red)
 * - Sortable columns
 * - Compact responsive design
 */
export function VersionStatsTable({ data }: VersionStatsTableProps) {
	const t = useTranslations('category.versionStats')

	if (data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-base sm:text-lg'>{t('title')}</CardTitle>
					<CardDescription className='text-xs sm:text-sm'>
						{t('description')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-sm text-muted-foreground text-center py-4'>
						{t('noData')}
					</p>
				</CardContent>
			</Card>
		)
	}

	// Helper to get quality color
	const getQualityColor = (percentage: number) => {
		if (percentage >= 80) return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
		if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
		return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base sm:text-lg'>{t('title')}</CardTitle>
				<CardDescription className='text-xs sm:text-sm'>
					{t('description')}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className='rounded-md border overflow-hidden'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className='w-[100px]'>{t('version')}</TableHead>
								<TableHead className='text-right'>{t('records')}</TableHead>
								<TableHead className='text-right'>{t('quality')}</TableHead>
								<TableHead className='text-right'>{t('changed')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map((item) => (
								<TableRow key={item.version}>
									<TableCell className='font-medium'>
										<Badge variant='outline'>{item.version}</Badge>
									</TableCell>
									<TableCell className='text-right'>
										{item.totalRecords.toLocaleString()}
									</TableCell>
									<TableCell className='text-right'>
										<Badge className={getQualityColor(item.goodPercentage)}>
											{item.goodPercentage.toFixed(1)}%
										</Badge>
									</TableCell>
									<TableCell className='text-right text-sm text-muted-foreground'>
										{item.changedRecords}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				{/* Summary footer */}
				<div className='mt-4 pt-4 border-t'>
					<div className='flex items-center justify-between text-sm'>
						<span className='text-muted-foreground'>{t('totalVersions')}:</span>
						<span className='font-medium'>{data.length}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
