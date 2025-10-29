'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconLanguage } from '@tabler/icons-react'

const languages = [
	{ code: 'ru', name: 'Русский', flag: '🇷🇺' },
	{ code: 'en', name: 'English', flag: '🇺🇸' },
] as const

export function LanguageSwitcher() {
	const locale = useLocale()
	const router = useRouter()
	const pathname = usePathname()

	const changeLocale = (newLocale: 'ru' | 'en') => {
		// Use next-intl's router which handles locale switching automatically
		router.replace(pathname, { locale: newLocale })
	}

	const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='ghost' size='sm' className='gap-2'>
					<IconLanguage className='h-4 w-4' />
					<span className='hidden sm:inline'>{currentLanguage.flag}</span>
					<span className='hidden md:inline'>{currentLanguage.name}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				{languages.map((language) => (
					<DropdownMenuItem
						key={language.code}
						onClick={() => changeLocale(language.code)}
						className={locale === language.code ? 'bg-accent' : ''}
					>
						<span className='mr-2'>{language.flag}</span>
						<span>{language.name}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
