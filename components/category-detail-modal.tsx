'use client'

/**
 * Category Detail Modal Component
 *
 * Shows category details in a modal dialog
 * Used by Parallel Routes to display category without leaving the dashboard
 */

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { CategoryDetailContent } from '@/components/category-detail-content'
import { getCategoryLabel } from '@/constants/category-labels'
import type { CategoryDetailData } from '@/lib/supabase/types'

interface CategoryDetailModalProps {
	categoryName: string
	initialData: CategoryDetailData
}

export function CategoryDetailModal({ categoryName, initialData }: CategoryDetailModalProps) {
	const router = useRouter()
	const t = useTranslations('category')

	// Close modal by navigating back
	const handleClose = () => {
		router.back()
	}

	return (
		<Dialog open onOpenChange={handleClose}>
			<DialogContent className='max-w-[95vw] w-full sm:max-w-[90vw] lg:max-w-7xl h-[95vh] sm:h-[90vh] p-0 gap-0 flex flex-col overflow-hidden'>
				<DialogHeader className='sr-only'>
					<DialogTitle>{getCategoryLabel(categoryName)}</DialogTitle>
					<DialogDescription>{t('subtitle')}</DialogDescription>
				</DialogHeader>

				<div className='flex-1 overflow-y-auto overflow-x-hidden'>
					<div className='p-4 sm:p-6'>
						<CategoryDetailContent
							categoryName={categoryName}
							isModal={true}
							initialData={initialData}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
