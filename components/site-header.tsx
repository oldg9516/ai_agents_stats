'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { LanguageSwitcher } from '@/components/language-switcher'

const PAGE_TITLE_KEYS: Record<string, string> = {
	'/': 'common.home',
	'/dashboard': 'common.dashboard',
	'/detailed-stats': 'common.detailedStats',
	'/support-overview': 'common.supportOverview',
	'/request-categories': 'common.requestCategories',
	'/docs': 'common.documentation',
	'/settings': 'common.settings',
}

export function SiteHeader() {
	const pathname = usePathname()
	const t = useTranslations()

	// Handle dynamic routes like /support-overview/[threadId]
	const getPageTitle = () => {
		// Remove locale prefix from pathname
		const pathWithoutLocale = pathname.replace(/^\/(ru|en)/, '') || '/'

		// Check exact match first
		if (PAGE_TITLE_KEYS[pathWithoutLocale]) {
			return t(PAGE_TITLE_KEYS[pathWithoutLocale])
		}

		// Check if it's a sub-route (e.g., /support-overview/123)
		const segments = pathWithoutLocale.split('/').filter(Boolean)
		if (segments.length > 1) {
			const basePath = `/${segments[0]}`
			if (PAGE_TITLE_KEYS[basePath]) {
				return t(PAGE_TITLE_KEYS[basePath])
			}
		}

		return 'Page'
	}

	return (
		<header className='flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)'>
			<div className='flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
				<SidebarTrigger className='-ml-1' />
				<Separator
					orientation='vertical'
					className='mx-2 data-[orientation=vertical]:h-4'
				/>
				<h1 className='text-base font-medium'>{getPageTitle()}</h1>
				<div className='ml-auto'>
					<LanguageSwitcher />
				</div>
				{/* <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div> */}
			</div>
		</header>
	)
}
