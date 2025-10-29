'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function BackButton() {
	const router = useRouter()
	const t = useTranslations('common')

	return (
		<Button variant='ghost' className='mb-4 -ml-4' onClick={() => router.back()}>
			<ArrowLeft className='mr-2 h-4 w-4' />
			{t('back')}
		</Button>
	)
}
