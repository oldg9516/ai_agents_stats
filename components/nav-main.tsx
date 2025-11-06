'use client'

import { type Icon } from '@tabler/icons-react'
import { useRouter, usePathname } from 'next/navigation'

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import Link from 'next/link'
import { Separator } from './ui/separator'

export function NavMain({
	items,
}: {
	items: {
		title: string
		url: string
		icon?: Icon
	}[]
}) {
	const router = useRouter()
	const pathname = usePathname()

	/**
	 * Check if the current path is active
	 * Matches exact path or any subpath (e.g., /support-overview/thread/123)
	 */
	const isActive = (itemUrl: string) => {
		// Remove locale prefix from pathname (e.g., /ru/dashboard -> /dashboard)
		const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/')

		// Exact match or starts with the item URL (for sub-routes)
		return pathWithoutLocale === itemUrl || pathWithoutLocale.startsWith(`${itemUrl}/`)
	}

	/**
	 * Prefetch page on hover for instant navigation
	 * Next.js will preload the page in the background
	 */
	const handleMouseEnter = (url: string) => {
		router.prefetch(url)
	}

	return (
		<SidebarGroup>
			<SidebarGroupContent className='flex flex-col gap-2'>
				<SidebarMenu>
					<SidebarMenuItem className='flex items-center gap-2'>
						<Separator />
					</SidebarMenuItem>
				</SidebarMenu>
				<SidebarMenu>
					{items.map(item => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								tooltip={item.title}
								asChild
								isActive={isActive(item.url)}
								onMouseEnter={() => handleMouseEnter(item.url)}
							>
								<Link href={item.url}>
									{item.icon && <item.icon />}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
