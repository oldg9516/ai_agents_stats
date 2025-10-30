'use client'

import {
	IconBook,
	IconCamera,
	IconDashboard,
	IconDatabase,
	IconFileAi,
	IconFileDescription,
	IconFileWord,
	IconHeadset,
	IconHeartBroken,
	IconHelp,
	IconListDetails,
	IconReport,
	IconSearch,
	IconSettings,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { NavDocuments } from '@/components/nav-documents'
import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Link } from '@/i18n/routing'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const t = useTranslations('common')
	const tSidebar = useTranslations('sidebar')

	const data = {
		user: {
			name: 'shadcn',
			email: 'm@example.com',
			avatar: '/avatars/vercel.svg',
		},
		navMain: [
			{
				title: t('dashboard'),
				url: '/dashboard',
				icon: IconDashboard,
			},
			{
				title: t('detailedStats'),
				url: '/detailed-stats',
				icon: IconListDetails,
			},
			{
				title: t('supportOverview'),
				url: '/support-overview',
				icon: IconHeadset,
			},
			{
				title: t('documentation'),
				url: '/docs',
				icon: IconBook,
			},
			{
				title: t('settings'),
				url: '/settings',
				icon: IconSettings,
			},
		],
		navClouds: [
			{
				title: tSidebar('capture'),
				icon: IconCamera,
				isActive: true,
				url: '#',
				items: [
					{
						title: tSidebar('activeProposals'),
						url: '#',
					},
					{
						title: tSidebar('archived'),
						url: '#',
					},
				],
			},
			{
				title: tSidebar('proposal'),
				icon: IconFileDescription,
				url: '#',
				items: [
					{
						title: tSidebar('activeProposals'),
						url: '#',
					},
					{
						title: tSidebar('archived'),
						url: '#',
					},
				],
			},
			{
				title: tSidebar('prompts'),
				icon: IconFileAi,
				url: '#',
				items: [
					{
						title: tSidebar('activeProposals'),
						url: '#',
					},
					{
						title: tSidebar('archived'),
						url: '#',
					},
				],
			},
		],
		navSecondary: [
			{
				title: tSidebar('getHelp'),
				url: '#',
				icon: IconHelp,
			},
			{
				title: t('search'),
				url: '#',
				icon: IconSearch,
			},
		],
		documents: [
			{
				name: tSidebar('dataLibrary'),
				url: '#',
				icon: IconDatabase,
			},
			{
				name: tSidebar('reports'),
				url: '#',
				icon: IconReport,
			},
			{
				name: tSidebar('wordAssistant'),
				url: '#',
				icon: IconFileWord,
			},
		],
	}

	return (
		<Sidebar collapsible='offcanvas' {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className='data-[slot=sidebar-menu-button]:!p-1.5'
						>
							<Link href='/'>
								<IconHeartBroken className='!size-5' />
								<span className='text-base font-semibold'>
									{tSidebar('appTitle')}
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavDocuments items={data.documents} />
				<NavSecondary items={data.navSecondary} className='mt-auto' />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	)
}
