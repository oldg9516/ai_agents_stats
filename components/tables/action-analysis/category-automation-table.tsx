'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { CategoryActionStats } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { Fragment, memo, useState } from 'react'

interface CategoryAutomationTableProps {
	data: CategoryActionStats[]
}

function getAccuracyColor(accuracy: number): string {
	if (accuracy >= 90) return 'text-green-600 dark:text-green-400'
	if (accuracy >= 70) return 'text-yellow-600 dark:text-yellow-400'
	return 'text-red-600 dark:text-red-400'
}

/**
 * Category Breakdown Table
 *
 * Shows per-category stats:
 * - Total tickets, requires_action true/false, verified count, accuracy
 * - Expandable sub-subcategory rows
 */
export const CategoryAutomationTable = memo(function CategoryAutomationTable({
	data,
}: CategoryAutomationTableProps) {
	const t = useTranslations('actionAnalysis')
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

	const toggleCategory = (category: string) => {
		setExpandedCategories(prev => {
			const next = new Set(prev)
			if (next.has(category)) {
				next.delete(category)
			} else {
				next.add(category)
			}
			return next
		})
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center gap-1.5'>
					<CardTitle className='text-lg sm:text-xl'>
						{t('categoryBreakdown')}
					</CardTitle>
					<InfoTooltip content={t('tooltipCategoryBreakdown')} />
				</div>
				<CardDescription className='text-sm'>
					{t('tableDescription')}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className='rounded-md border overflow-x-auto'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className='w-[250px]'>{t('category')}</TableHead>
								<TableHead className='text-right w-[80px]'>{t('total')}</TableHead>
								<TableHead className='text-right w-[80px]'>{t('true')}</TableHead>
								<TableHead className='text-right w-[80px]'>{t('false')}</TableHead>
								<TableHead className='text-right w-[80px]'>{t('verified')}</TableHead>
								<TableHead className='text-right w-[120px]'>{t('requiresActionAccuracy')}</TableHead>
								<TableHead className='text-right w-[120px]'>{t('actionTypeAccuracy')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map(cat => {
								const isExpanded = expandedCategories.has(cat.category)
								const hasSubCategories = cat.subSubCategoryBreakdown.length > 0
									&& !(cat.subSubCategoryBreakdown.length === 1 && cat.subSubCategoryBreakdown[0].subSubCategory === 'N/A')

								return (
									<Fragment key={cat.category}>
										<TableRow
											className={cn(
												hasSubCategories && 'cursor-pointer hover:bg-muted/50',
												isExpanded && 'bg-muted/30'
											)}
											onClick={() => hasSubCategories && toggleCategory(cat.category)}
										>
											<TableCell className='font-medium'>
												<div className='flex items-center gap-1.5'>
													{hasSubCategories ? (
														isExpanded ? (
															<IconChevronDown className='h-4 w-4 shrink-0 text-muted-foreground' />
														) : (
															<IconChevronRight className='h-4 w-4 shrink-0 text-muted-foreground' />
														)
													) : (
														<span className='w-4' />
													)}
													<span className='truncate'>{cat.category}</span>
												</div>
											</TableCell>
											<TableCell className='text-right font-medium'>
												{cat.totalRecords}
											</TableCell>
											<TableCell className='text-right text-muted-foreground'>
												{cat.requiresActionTrue}
											</TableCell>
											<TableCell className='text-right text-muted-foreground'>
												{cat.requiresActionFalse}
											</TableCell>
											<TableCell className='text-right text-muted-foreground'>
												{cat.totalVerified}
											</TableCell>
											<TableCell className={cn('text-right font-medium', cat.totalVerified > 0 ? getAccuracyColor(cat.requiresActionAccuracy) : 'text-muted-foreground')}>
												{cat.totalVerified > 0 ? `${cat.requiresActionAccuracy.toFixed(1)}%` : '—'}
											</TableCell>
											<TableCell className={cn('text-right font-medium', cat.totalVerified > 0 ? getAccuracyColor(cat.actionTypeAccuracy) : 'text-muted-foreground')}>
												{cat.totalVerified > 0 ? `${cat.actionTypeAccuracy.toFixed(1)}%` : '—'}
											</TableCell>
										</TableRow>
										{/* Expandable sub-subcategory rows */}
										{isExpanded && cat.subSubCategoryBreakdown.map(sub => (
											<TableRow
												key={`${cat.category}-${sub.subSubCategory}`}
												className='bg-muted/10'
											>
												<TableCell className='pl-10 text-muted-foreground'>
													{sub.subSubCategory}
												</TableCell>
												<TableCell className='text-right text-muted-foreground'>
													{sub.totalRecords}
												</TableCell>
												<TableCell className='text-right text-muted-foreground'>
													{sub.requiresActionTrue}
												</TableCell>
												<TableCell className='text-right text-muted-foreground'>
													{sub.requiresActionFalse}
												</TableCell>
												<TableCell />
												<TableCell />
												<TableCell />
											</TableRow>
										))}
									</Fragment>
								)
							})}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
})
