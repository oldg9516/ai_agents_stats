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
import { Badge } from '@/components/ui/badge'
import type { CategoryAutomationOverviewStats } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { Fragment, memo, useState } from 'react'

interface AutomationOverviewTableProps {
	data: CategoryAutomationOverviewStats[]
}

function getRateColor(rate: number): string {
	if (rate >= 70) return 'text-green-600 dark:text-green-400'
	if (rate >= 40) return 'text-yellow-600 dark:text-yellow-400'
	return 'text-red-600 dark:text-red-400'
}

/**
 * Automation Overview Table
 *
 * Shows per-category auto-reply vs draft breakdown:
 * - Columns: Category | Rule | Total | Auto-Reply | Draft | Rate%
 * - Expandable sub-subcategory rows
 */
export const AutomationOverviewTable = memo(function AutomationOverviewTable({
	data,
}: AutomationOverviewTableProps) {
	const t = useTranslations('automationOverview')
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
						{t('tableTitle')}
					</CardTitle>
					<InfoTooltip content={t('tooltipTable')} />
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
								<TableHead className='w-[220px]'>{t('category')}</TableHead>
								<TableHead className='w-[130px]'>{t('rule')}</TableHead>
								<TableHead className='text-right w-[80px]'>{t('total')}</TableHead>
								<TableHead className='text-right w-[100px]'>{t('autoReply')}</TableHead>
								<TableHead className='text-right w-[80px]'>{t('draft')}</TableHead>
								<TableHead className='text-right w-[90px]'>{t('rate')}</TableHead>
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
											<TableCell>
												<Badge variant='outline' className='text-xs font-mono'>
													{cat.ruleSource}
												</Badge>
											</TableCell>
											<TableCell className='text-right font-medium'>
												{cat.totalRecords}
											</TableCell>
											<TableCell className='text-right text-muted-foreground'>
												{cat.autoReplyCount}
											</TableCell>
											<TableCell className='text-right text-muted-foreground'>
												{cat.draftCount}
											</TableCell>
											<TableCell className={cn('text-right font-medium', getRateColor(cat.autoReplyRate))}>
												{cat.autoReplyRate.toFixed(1)}%
											</TableCell>
										</TableRow>
										{/* Expandable sub-subcategory rows */}
										{isExpanded && cat.subSubCategoryBreakdown.map(sub => {
											const subRate = sub.totalRecords > 0 ? (sub.autoReplyCount / sub.totalRecords) * 100 : 0
											return (
												<TableRow
													key={`${cat.category}-${sub.subSubCategory}`}
													className='bg-muted/10'
												>
													<TableCell className='pl-10 text-muted-foreground'>
														{sub.subSubCategory}
													</TableCell>
													<TableCell />
													<TableCell className='text-right text-muted-foreground'>
														{sub.totalRecords}
													</TableCell>
													<TableCell className='text-right text-muted-foreground'>
														{sub.autoReplyCount}
													</TableCell>
													<TableCell className='text-right text-muted-foreground'>
														{sub.draftCount}
													</TableCell>
													<TableCell className={cn('text-right text-muted-foreground', getRateColor(subRate))}>
														{subRate.toFixed(1)}%
													</TableCell>
												</TableRow>
											)
										})}
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
