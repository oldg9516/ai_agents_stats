import { getTranslations } from 'next-intl/server'
import { SentimentContent } from '@/components/sentiment-content'

export async function generateMetadata() {
	const t = await getTranslations('sentiment')
	return {
		title: t('title'),
		description: t('description'),
	}
}

/**
 * AI Sentiment Analytics Page
 *
 * Customer mood per request (episode): index, mix, heatmaps by subcategory, customer
 * tenure and weekday, plus how the mood moves inside a ticket.
 */
export default function SentimentPage() {
	return <SentimentContent />
}
