import { getTranslations } from 'next-intl/server'
import { SubcategoriesStatsContent } from '@/components/subcategories-stats-content'

export async function generateMetadata() {
	const t = await getTranslations('subcategoriesStats')
	return {
		title: t('title'),
		description: t('description'),
	}
}

/**
 * Subcategories Statistics Page
 *
 * Displays AI quality performance grouped by category and subcategory
 * Shows which sub-subcategories AI answers best in
 */
export default function SubcategoriesStatsPage() {
	return <SubcategoriesStatsContent />
}
